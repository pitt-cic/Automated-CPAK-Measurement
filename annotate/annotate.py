#!/usr/bin/env python3
"""
CPAK X-Ray Annotation Tool - Manual Point Placement

User clicks to place each keypoint sequentially.
Performance optimized with canvas items.
"""

import tkinter as tk
from tkinter import ttk, messagebox
from PIL import Image, ImageTk, ImageEnhance
import cv2
import json
import numpy as np
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).parent

# Configuration
EXTRACTED_DIR = BASE_DIR / "data" / "toBeAnnotated"
OUTPUT_DIR = BASE_DIR / "data" / "output"
SKIPPED_DIR = BASE_DIR / "data" / "skipped"
ANNOTATIONS_FILE = BASE_DIR / "data" / "annotations.json"

# Point definitions (8 points per leg)
POINT_NAMES = [
    "femoral_head_center",
    "knee_center_femoral",
    "knee_center_tibial",
    "ankle_center",
    "inner_upper",
    "outer_upper",
    "inner_lower",
    "outer_lower"
]

POINT_LABELS = [
    "Femoral Head",
    "Knee (Femoral)",
    "Knee (Tibial)",
    "Ankle Center",
    "Inner Upper",
    "Outer Upper",
    "Inner Lower",
    "Outer Lower"
]

# Colors for each point
POINT_COLORS = [
    "#FF0000",  # Red - Femoral head
    "#00FF00",  # Green - Knee (femoral)
    "#32CD32",  # Lime - Knee (tibial)
    "#0000FF",  # Blue - Ankle
    "#FFFF00",  # Yellow - Inner upper
    "#00FFFF",  # Cyan - Outer upper
    "#FF00FF",  # Magenta - Inner lower
    "#FFA500",  # Orange - Outer lower
]

class ImageProcessor:
    """Handles image loading and enhancement."""

    @staticmethod
    def load_image(path):
        img = Image.open(path).convert('L')
        return np.array(img)

    @staticmethod
    def enhance_contrast(image, clip_limit=2.0, tile_size=8):
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(tile_size, tile_size))
        return clahe.apply(image)

    @staticmethod
    def apply_adjustments(image, brightness=1.0, contrast=1.0, sharpness=1.0):
        pil_img = Image.fromarray(image).convert('L')
        if brightness != 1.0:
            pil_img = ImageEnhance.Brightness(pil_img).enhance(brightness)
        if contrast != 1.0:
            pil_img = ImageEnhance.Contrast(pil_img).enhance(contrast)
        if sharpness != 1.0:
            pil_img = ImageEnhance.Sharpness(pil_img).enhance(sharpness)
        return np.array(pil_img)

    @staticmethod
    def crop_leg(image, leg):
        h, w = image.shape
        half_w = w // 2
        if leg == 'right':
            return image[:, :half_w]
        else:
            return image[:, half_w:]


class AnnotationTool:
    """Main GUI for manual point placement annotation.

    Performance optimized: points and lines are canvas items, not drawn on image.
    """

    def __init__(self, root):
        self.root = root
        self.root.title("CPAK Annotation Tool - Manual Point Placement")
        self.root.geometry("1300x950")

        # Data state
        self.annotations = self.load_annotations()
        self.pending_images = self.get_pending_images()
        self.current_index = 0

        # Image state
        self.current_image = None
        self.enhanced_image = None
        self.original_size = (0, 0)

        # Current leg being annotated
        self.current_leg = "right"
        self.leg_image = None  # Current leg crop

        # Points for current leg (in leg image coordinates)
        self.points = {}  # {point_name: (x, y)}
        self.current_point_index = 0  # Which point we're placing next

        # Points for completed leg
        self.right_points = {}
        self.left_points = {}

        # Display state
        self.zoom_level = 1.0  # 1.0 = fit to canvas
        self.pan_offset = [0, 0]  # [x, y] offset for panning
        self.display_scale = 1.0
        self.photo_image = None

        # Cached display image (rebuilt only when needed)
        self.cached_display_image = None
        self.cache_valid = False
        self.cached_brightness = 1.0
        self.cached_contrast = 1.0
        self.cached_sharpness = 1.0
        self.cached_zoom = 1.0

        # Canvas item IDs for points and lines
        self.point_items = {}  # {point_name: (outer_oval_id, center_dot_id)}
        self.line_items = {}   # {line_name: line_id}
        self.image_item = None  # Canvas image item ID

        # Drag state
        self.dragging_point = None
        self.is_panning = False

        # Image adjustments
        self.brightness = 1.0
        self.contrast = 1.0
        self.sharpness = 1.0

        # Display options
        self.show_lines = True

        # Create directories
        OUTPUT_DIR.mkdir(exist_ok=True)
        SKIPPED_DIR.mkdir(exist_ok=True)

        # Build UI
        self.setup_ui()
        self.bind_events()

        # Load first image
        if self.pending_images:
            self.root.after(100, self.load_current_image)
        else:
            messagebox.showinfo("Complete", "All images have been annotated!")

    def load_annotations(self):
        if ANNOTATIONS_FILE.exists():
            with open(ANNOTATIONS_FILE, 'r') as f:
                return json.load(f)
        return {
            "metadata": {
                "version": "2.0",
                "created": datetime.now().isoformat(),
                "point_names": POINT_NAMES
            },
            "images": {}
        }

    def save_annotations(self):
        self.annotations["metadata"]["last_modified"] = datetime.now().isoformat()
        with open(ANNOTATIONS_FILE, 'w') as f:
            json.dump(self.annotations, f, indent=2)

    def get_pending_images(self):
        if not EXTRACTED_DIR.exists():
            messagebox.showerror("Error", f"Directory not found: {EXTRACTED_DIR}")
            return []

        all_images = sorted([f.name for f in EXTRACTED_DIR.glob("*.png")])
        annotated = set(self.annotations.get("images", {}).keys())
        output_images = set(f.name for f in OUTPUT_DIR.glob("*.png")) if OUTPUT_DIR.exists() else set()
        skipped_images = set(f.name for f in SKIPPED_DIR.glob("*.png")) if SKIPPED_DIR.exists() else set()

        return [img for img in all_images
                if img not in annotated and img not in output_images and img not in skipped_images]

    def setup_ui(self):
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        # Top bar
        top_frame = ttk.Frame(main_frame)
        top_frame.pack(fill=tk.X, pady=(0, 10))

        self.progress_label = ttk.Label(top_frame, text="Progress: 0/0", font=('Arial', 12, 'bold'))
        self.progress_label.pack(side=tk.LEFT)

        self.filename_label = ttk.Label(top_frame, text="", font=('Arial', 10))
        self.filename_label.pack(side=tk.RIGHT)

        # Content area
        content_frame = ttk.Frame(main_frame)
        content_frame.pack(fill=tk.BOTH, expand=True)

        # Canvas
        canvas_frame = ttk.Frame(content_frame)
        canvas_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.canvas = tk.Canvas(canvas_frame, bg='black', width=800, height=850)
        self.canvas.pack(fill=tk.BOTH, expand=True)

        # Sidebar (original v2 sizing)
        sidebar = ttk.Frame(content_frame, width=380)
        sidebar.pack(side=tk.RIGHT, fill=tk.Y, padx=(10, 0))
        sidebar.pack_propagate(False)

        # Current leg
        leg_frame = ttk.LabelFrame(sidebar, text="Current Leg", padding=10)
        leg_frame.pack(fill=tk.X, pady=(0, 10))

        self.leg_label = ttk.Label(leg_frame, text="RIGHT LEG", font=('Arial', 16, 'bold'))
        self.leg_label.pack()

        # Point Legend
        legend_frame = ttk.LabelFrame(sidebar, text="Points (click to place)", padding=10)
        legend_frame.pack(fill=tk.X, pady=(0, 10))

        self.legend_labels = []
        for i, (name, label) in enumerate(zip(POINT_NAMES, POINT_LABELS)):
            row = ttk.Frame(legend_frame)
            row.pack(fill=tk.X, pady=2)

            # Color indicator
            color_canvas = tk.Canvas(row, width=20, height=20, highlightthickness=0)
            color_canvas.pack(side=tk.LEFT, padx=(0, 8))
            color_canvas.create_oval(3, 3, 17, 17, fill=POINT_COLORS[i], outline='white', width=1)

            # Label
            lbl = ttk.Label(row, text=f"{i+1}. {label}", font=('Arial', 10))
            lbl.pack(side=tk.LEFT)
            self.legend_labels.append(lbl)

        # Inner/Outer reminder for knee points
        ttk.Label(legend_frame, text="(Inner = toward body center)",
                  font=('Arial', 8), foreground='gray').pack(anchor=tk.W, pady=(5, 0))

        # Display options
        options_frame = ttk.LabelFrame(sidebar, text="Display Options", padding=10)
        options_frame.pack(fill=tk.X, pady=(0, 10))

        self.show_lines_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(options_frame, text="Show connecting lines",
                        variable=self.show_lines_var,
                        command=self.on_toggle_lines).pack(anchor=tk.W)

        # Zoom control
        zoom_frame = ttk.LabelFrame(sidebar, text="Zoom", padding=10)
        zoom_frame.pack(fill=tk.X, pady=(0, 10))

        self.zoom_var = tk.DoubleVar(value=1.0)
        self.zoom_slider = ttk.Scale(zoom_frame, from_=0.3, to=10.0,
                                     variable=self.zoom_var, orient=tk.HORIZONTAL,
                                     command=self.on_zoom_change)
        self.zoom_slider.pack(fill=tk.X)

        zoom_btn_frame = ttk.Frame(zoom_frame)
        zoom_btn_frame.pack(fill=tk.X, pady=(5, 0))
        ttk.Button(zoom_btn_frame, text="Fit", command=lambda: self.set_zoom(1.0)).pack(side=tk.LEFT, padx=2)
        ttk.Button(zoom_btn_frame, text="3x", command=lambda: self.set_zoom(3.0)).pack(side=tk.LEFT, padx=2)
        ttk.Button(zoom_btn_frame, text="5x", command=lambda: self.set_zoom(5.0)).pack(side=tk.LEFT, padx=2)
        ttk.Button(zoom_btn_frame, text="10x", command=lambda: self.set_zoom(10.0)).pack(side=tk.LEFT, padx=2)

        self.zoom_label = ttk.Label(zoom_frame, text="Zoom: 100%", font=('Arial', 9))
        self.zoom_label.pack(pady=(5, 0))

        ttk.Label(zoom_frame, text="Right-click + drag to pan",
                  font=('Arial', 8), foreground='gray').pack(anchor=tk.W, pady=(5, 0))

        # Image adjustments
        adjust_frame = ttk.LabelFrame(sidebar, text="Image Adjustments", padding=10)
        adjust_frame.pack(fill=tk.X, pady=(0, 10))

        ttk.Label(adjust_frame, text="Brightness:", font=('Arial', 9)).pack(anchor=tk.W)
        self.brightness_var = tk.DoubleVar(value=1.0)
        ttk.Scale(adjust_frame, from_=0.3, to=2.5, variable=self.brightness_var,
                  orient=tk.HORIZONTAL, command=self.on_adjustment_change).pack(fill=tk.X)

        ttk.Label(adjust_frame, text="Contrast:", font=('Arial', 9)).pack(anchor=tk.W)
        self.contrast_var = tk.DoubleVar(value=1.0)
        ttk.Scale(adjust_frame, from_=0.3, to=3.0, variable=self.contrast_var,
                  orient=tk.HORIZONTAL, command=self.on_adjustment_change).pack(fill=tk.X)

        ttk.Label(adjust_frame, text="Sharpness:", font=('Arial', 9)).pack(anchor=tk.W)
        self.sharpness_var = tk.DoubleVar(value=1.0)
        ttk.Scale(adjust_frame, from_=0.0, to=3.0, variable=self.sharpness_var,
                  orient=tk.HORIZONTAL, command=self.on_adjustment_change).pack(fill=tk.X)

        ttk.Button(adjust_frame, text="Reset", command=self.reset_adjustments).pack(fill=tk.X, pady=(5, 0))

        # Status
        self.status_label = ttk.Label(sidebar, text="Click to place points",
                                      foreground="yellow", wraplength=350, font=('Arial', 10))
        self.status_label.pack(pady=10)

        # Action buttons
        action_frame = ttk.Frame(sidebar)
        action_frame.pack(fill=tk.X, pady=10)

        ttk.Button(action_frame, text="Undo Last Point (U)",
                   command=self.undo_last_point).pack(fill=tk.X, pady=2)
        ttk.Button(action_frame, text="Reset All Points (R)",
                   command=self.reset_points).pack(fill=tk.X, pady=2)
        self.confirm_btn = ttk.Button(action_frame, text="Confirm Right Leg (Enter)",
                   command=self.confirm_or_save)
        self.confirm_btn.pack(fill=tk.X, pady=2)

        # Skip button - red and separated to avoid accidental clicks
        ttk.Separator(action_frame, orient=tk.HORIZONTAL).pack(fill=tk.X, pady=8)
        self.skip_btn = tk.Button(action_frame, text="Skip Image (S)",
                                  command=self.skip_image,
                                  bg='#8B0000', fg='white',
                                  activebackground='#CD0000', activeforeground='white')
        self.skip_btn.pack(fill=tk.X, pady=2)

        self.update_progress()

    def bind_events(self):
        # Keyboard
        self.root.bind("<Return>", lambda e: self.confirm_or_save())
        self.root.bind("s", lambda e: self.skip_image())
        self.root.bind("S", lambda e: self.skip_image())
        self.root.bind("r", lambda e: self.reset_points())
        self.root.bind("R", lambda e: self.reset_points())
        self.root.bind("u", lambda e: self.undo_last_point())
        self.root.bind("U", lambda e: self.undo_last_point())

        # Mouse on canvas
        self.canvas.bind("<Button-1>", self.on_mouse_down)
        self.canvas.bind("<B1-Motion>", self.on_mouse_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_mouse_up)
        self.canvas.bind("<MouseWheel>", self.on_mouse_wheel)
        self.canvas.bind("<Button-4>", self.on_mouse_wheel)
        self.canvas.bind("<Button-5>", self.on_mouse_wheel)

        # Right-click drag to pan
        self.canvas.bind("<Button-3>", self.on_pan_start)
        self.canvas.bind("<B3-Motion>", self.on_pan_drag)

    def load_current_image(self):
        if not self.pending_images or self.current_index >= len(self.pending_images):
            messagebox.showinfo("Complete", "All images have been annotated!")
            return

        filename = self.pending_images[self.current_index]
        filepath = EXTRACTED_DIR / filename

        try:
            self.current_image = ImageProcessor.load_image(filepath)
            self.original_size = (self.current_image.shape[1], self.current_image.shape[0])
            self.enhanced_image = ImageProcessor.enhance_contrast(self.current_image)

            # Reset state
            self.right_points = {}
            self.left_points = {}
            self.current_leg = "right"
            self.zoom_level = 1.0
            self.zoom_var.set(1.0)
            self.pan_offset = [0, 0]
            self.cache_valid = False

            self.filename_label.config(text=filename)
            self.confirm_btn.config(text="Confirm Right Leg (Enter)")
            self.load_leg()

        except Exception as e:
            messagebox.showerror("Error", f"Failed to load image:\n{e}")
            import traceback
            traceback.print_exc()

    def load_leg(self):
        """Load current leg for manual point placement."""
        self.leg_image = ImageProcessor.crop_leg(self.enhanced_image, self.current_leg)
        self.cache_valid = False

        # Start with no points - user will place them
        self.points = {}
        self.current_point_index = 0

        # Reset view
        self.zoom_level = 1.0
        self.zoom_var.set(1.0)
        self.pan_offset = [0, 0]

        self.update_leg_label()
        self.update_current_point_display()
        self.rebuild_display()

    def update_leg_label(self):
        if self.current_leg == "right":
            self.leg_label.config(text="RIGHT LEG", foreground="#32CD32")
        else:
            self.leg_label.config(text="LEFT LEG", foreground="#00BFFF")

    def update_current_point_display(self):
        """Update legend to highlight current point and update status."""
        for i, lbl in enumerate(self.legend_labels):
            if i < self.current_point_index:
                # Already placed
                lbl.config(foreground="gray", font=('Arial', 10))
            elif i == self.current_point_index:
                # Current point to place
                lbl.config(foreground=POINT_COLORS[i], font=('Arial', 10, 'bold'))
            else:
                # Not yet placed
                lbl.config(foreground="white", font=('Arial', 10))

        if self.current_point_index < len(POINT_NAMES):
            current_label = POINT_LABELS[self.current_point_index]
            self.status_label.config(text=f"Click to place: {current_label}")
        else:
            self.status_label.config(text="All points placed. Drag to adjust, then confirm.")

    def rebuild_display(self):
        """Full rebuild of the display - called when zoom/pan/adjustments change."""
        if self.leg_image is None:
            return

        # Check if we need to rebuild the cached image
        brightness = self.brightness_var.get()
        contrast = self.contrast_var.get()
        sharpness = self.sharpness_var.get()

        needs_image_rebuild = (
            not self.cache_valid or
            brightness != self.cached_brightness or
            contrast != self.cached_contrast or
            sharpness != self.cached_sharpness or
            self.zoom_level != self.cached_zoom
        )

        if needs_image_rebuild:
            self.rebuild_cached_image()

        # Get canvas size (winfo_width returns 1 before widget is mapped, not 0)
        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()
        if canvas_width < 10:
            canvas_width = 800
        if canvas_height < 10:
            canvas_height = 850

        # Calculate image position
        img_x = (canvas_width - self.img_display_size[0]) // 2 + self.pan_offset[0]
        img_y = (canvas_height - self.img_display_size[1]) // 2 + self.pan_offset[1]
        self.img_offset = (img_x, img_y)

        # Clear canvas and redraw
        self.canvas.delete("all")

        # Draw image
        self.image_item = self.canvas.create_image(img_x, img_y, anchor=tk.NW, image=self.photo_image)

        # Draw lines as canvas items
        self.draw_lines()

        # Draw points as canvas items
        self.draw_points()

        # Draw inner/outer labels
        self.draw_inner_outer_labels()

        # Update zoom label
        self.zoom_label.config(text=f"Zoom: {int(self.zoom_level * 100)}%")

    def rebuild_cached_image(self):
        """Rebuild the cached display image (expensive operation)."""
        brightness = self.brightness_var.get()
        contrast = self.contrast_var.get()
        sharpness = self.sharpness_var.get()

        # Apply adjustments if needed
        display_img = self.leg_image
        if brightness != 1.0 or contrast != 1.0 or sharpness != 1.0:
            display_img = ImageProcessor.apply_adjustments(
                self.leg_image, brightness, contrast, sharpness
            )

        # Get canvas size (winfo_width returns 1 before widget is mapped, not 0)
        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()
        if canvas_width < 10:
            canvas_width = 800
        if canvas_height < 10:
            canvas_height = 850

        img_h, img_w = display_img.shape

        # Calculate base scale to fit
        base_scale = min(canvas_width / img_w, canvas_height / img_h)
        self.display_scale = base_scale * self.zoom_level

        # Calculate display size (ensure at least 1 pixel)
        disp_w = max(1, int(img_w * self.display_scale))
        disp_h = max(1, int(img_h * self.display_scale))

        # Resize image
        resized = cv2.resize(display_img, (disp_w, disp_h), interpolation=cv2.INTER_LINEAR)

        # Convert to PhotoImage (grayscale)
        pil_image = Image.fromarray(resized)
        self.photo_image = ImageTk.PhotoImage(pil_image)

        # Store display size
        self.img_display_size = (disp_w, disp_h)

        # Update cache state
        self.cached_brightness = brightness
        self.cached_contrast = contrast
        self.cached_sharpness = sharpness
        self.cached_zoom = self.zoom_level
        self.cache_valid = True

    def draw_lines(self):
        """Draw connecting lines as canvas items."""
        self.line_items = {}

        if not self.show_lines:
            return

        def get_canvas_pt(name):
            if name not in self.points:
                return None
            x, y = self.points[name]
            cx = int(x * self.display_scale) + self.img_offset[0]
            cy = int(y * self.display_scale) + self.img_offset[1]
            return (cx, cy)

        def extend_line(p1, p2, extension=0.5):
            """Extend a line past both endpoints by a fraction of its length."""
            dx = p2[0] - p1[0]
            dy = p2[1] - p1[1]
            new_p1 = (int(p1[0] - dx * extension), int(p1[1] - dy * extension))
            new_p2 = (int(p2[0] + dx * extension), int(p2[1] + dy * extension))
            return new_p1, new_p2

        # Mechanical axis - femoral head to knee (femoral)
        fh = get_canvas_pt("femoral_head_center")
        kf = get_canvas_pt("knee_center_femoral")
        kt = get_canvas_pt("knee_center_tibial")
        ac = get_canvas_pt("ankle_center")

        if fh and kf:
            self.line_items["mech_upper"] = self.canvas.create_line(
                fh[0], fh[1], kf[0], kf[1], fill='yellow', width=2
            )
        if kt and ac:
            self.line_items["mech_lower"] = self.canvas.create_line(
                kt[0], kt[1], ac[0], ac[1], fill='yellow', width=2
            )

        # Upper joint line (extended)
        iu = get_canvas_pt("inner_upper")
        ou = get_canvas_pt("outer_upper")
        if iu and ou:
            ext_iu, ext_ou = extend_line(iu, ou)
            self.line_items["joint_upper"] = self.canvas.create_line(
                ext_iu[0], ext_iu[1], ext_ou[0], ext_ou[1], fill='#FF00FF', width=2
            )

        # Lower joint line (extended)
        il = get_canvas_pt("inner_lower")
        ol = get_canvas_pt("outer_lower")
        if il and ol:
            ext_il, ext_ol = extend_line(il, ol)
            self.line_items["joint_lower"] = self.canvas.create_line(
                ext_il[0], ext_il[1], ext_ol[0], ext_ol[1], fill='#FFA500', width=2
            )

    def draw_points(self):
        """Draw points as canvas items (ovals)."""
        self.point_items = {}

        for i, name in enumerate(POINT_NAMES):
            if name not in self.points:
                continue

            x, y = self.points[name]
            cx = int(x * self.display_scale) + self.img_offset[0]
            cy = int(y * self.display_scale) + self.img_offset[1]

            color = POINT_COLORS[i]

            # Outer circle (for easy dragging)
            outer = self.canvas.create_oval(
                cx - 14, cy - 14, cx + 14, cy + 14,
                outline=color, width=2
            )

            # Small center dot (shows exact placement)
            center = self.canvas.create_oval(
                cx - 3, cy - 3, cx + 3, cy + 3,
                fill=color, outline=color
            )

            self.point_items[name] = (outer, center)

    def update_point_position(self, point_name):
        """Update just the canvas items for a single point - FAST operation."""
        if point_name not in self.point_items or point_name not in self.points:
            return

        x, y = self.points[point_name]
        cx = int(x * self.display_scale) + self.img_offset[0]
        cy = int(y * self.display_scale) + self.img_offset[1]

        outer, center = self.point_items[point_name]

        # Move the ovals
        self.canvas.coords(outer, cx - 14, cy - 14, cx + 14, cy + 14)
        self.canvas.coords(center, cx - 3, cy - 3, cx + 3, cy + 3)

        # Update connected lines
        self.update_connected_lines(point_name)

    def update_connected_lines(self, point_name):
        """Update lines connected to the moved point."""
        def get_canvas_pt(name):
            if name not in self.points:
                return None
            x, y = self.points[name]
            cx = int(x * self.display_scale) + self.img_offset[0]
            cy = int(y * self.display_scale) + self.img_offset[1]
            return (cx, cy)

        def extend_line(p1, p2, extension=0.5):
            dx = p2[0] - p1[0]
            dy = p2[1] - p1[1]
            new_p1 = (int(p1[0] - dx * extension), int(p1[1] - dy * extension))
            new_p2 = (int(p2[0] + dx * extension), int(p2[1] + dy * extension))
            return new_p1, new_p2

        # Update mechanical axis lines
        if point_name in ["femoral_head_center", "knee_center_femoral"]:
            fh = get_canvas_pt("femoral_head_center")
            kf = get_canvas_pt("knee_center_femoral")
            if fh and kf and "mech_upper" in self.line_items:
                self.canvas.coords(self.line_items["mech_upper"], fh[0], fh[1], kf[0], kf[1])

        if point_name in ["knee_center_tibial", "ankle_center"]:
            kt = get_canvas_pt("knee_center_tibial")
            ac = get_canvas_pt("ankle_center")
            if kt and ac and "mech_lower" in self.line_items:
                self.canvas.coords(self.line_items["mech_lower"], kt[0], kt[1], ac[0], ac[1])

        # Update upper joint line
        if point_name in ["inner_upper", "outer_upper"]:
            iu = get_canvas_pt("inner_upper")
            ou = get_canvas_pt("outer_upper")
            if iu and ou and "joint_upper" in self.line_items:
                ext_iu, ext_ou = extend_line(iu, ou)
                self.canvas.coords(self.line_items["joint_upper"],
                                   ext_iu[0], ext_iu[1], ext_ou[0], ext_ou[1])

        # Update lower joint line
        if point_name in ["inner_lower", "outer_lower"]:
            il = get_canvas_pt("inner_lower")
            ol = get_canvas_pt("outer_lower")
            if il and ol and "joint_lower" in self.line_items:
                ext_il, ext_ol = extend_line(il, ol)
                self.canvas.coords(self.line_items["joint_lower"],
                                   ext_il[0], ext_il[1], ext_ol[0], ext_ol[1])

    def draw_inner_outer_labels(self):
        """Draw inner/outer labels at fixed positions on canvas edges."""
        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()
        if canvas_width < 10:
            canvas_width = 800
        if canvas_height < 10:
            canvas_height = 850

        # Fixed positions at screen edges
        left_x = 45
        right_x = canvas_width - 45
        label_y = canvas_height // 2

        # Determine which side is inner/outer based on leg
        if self.current_leg == "right":
            inner_x = right_x
            outer_x = left_x
        else:
            inner_x = left_x
            outer_x = right_x

        for text, x in [("INNER", inner_x), ("OUTER", outer_x)]:
            self.canvas.create_rectangle(x - 40, label_y - 15, x + 40, label_y + 15,
                                        fill='black', outline='white', width=1)
            self.canvas.create_text(x, label_y, text=text, fill='yellow',
                                   font=('Arial', 12, 'bold'))

    def canvas_to_image_coords(self, canvas_x, canvas_y):
        """Convert canvas coordinates to leg image coordinates."""
        img_x = (canvas_x - self.img_offset[0]) / self.display_scale
        img_y = (canvas_y - self.img_offset[1]) / self.display_scale
        return img_x, img_y

    def find_point_at(self, canvas_x, canvas_y, threshold=20):
        """Find which point is near the given canvas coordinates."""
        img_x, img_y = self.canvas_to_image_coords(canvas_x, canvas_y)

        for name, (px, py) in self.points.items():
            dist = ((px - img_x) ** 2 + (py - img_y) ** 2) ** 0.5
            # Scale threshold by zoom
            scaled_threshold = threshold / self.display_scale
            if dist < scaled_threshold:
                return name
        return None

    def on_mouse_down(self, event):
        """Handle mouse click - place point or start dragging."""
        # Check if clicking on existing point to drag it
        point = self.find_point_at(event.x, event.y)
        if point:
            # Dragging an existing point
            self.dragging_point = point
            self.is_panning = False
            self.status_label.config(text=f"Dragging: {POINT_LABELS[POINT_NAMES.index(point)]}")
        elif self.current_point_index < len(POINT_NAMES):
            # Place the next point
            img_x, img_y = self.canvas_to_image_coords(event.x, event.y)

            # Clamp to image bounds
            if self.leg_image is not None:
                h, w = self.leg_image.shape
                img_x = max(0, min(w - 1, img_x))
                img_y = max(0, min(h - 1, img_y))

            point_name = POINT_NAMES[self.current_point_index]
            self.points[point_name] = (img_x, img_y)
            self.current_point_index += 1

            self.update_current_point_display()
            self.rebuild_display()

            self.dragging_point = None
            self.is_panning = False
        else:
            # All points placed, allow panning
            self.dragging_point = None
            self.is_panning = True
            self.pan_start = (event.x, event.y)

    def on_mouse_drag(self, event):
        """Update position while dragging."""
        if self.dragging_point:
            # Moving a point - FAST path using canvas items
            img_x, img_y = self.canvas_to_image_coords(event.x, event.y)

            # Clamp to image bounds
            if self.leg_image is not None:
                h, w = self.leg_image.shape
                img_x = max(0, min(w - 1, img_x))
                img_y = max(0, min(h - 1, img_y))

            self.points[self.dragging_point] = (img_x, img_y)
            self.update_point_position(self.dragging_point)

        elif self.is_panning and hasattr(self, 'pan_start'):
            # Panning the view - move all canvas items
            dx = event.x - self.pan_start[0]
            dy = event.y - self.pan_start[1]
            self.pan_offset[0] += dx
            self.pan_offset[1] += dy
            self.pan_start = (event.x, event.y)

            # Move all items on canvas
            self.canvas.move("all", dx, dy)

            # Update img_offset for coordinate calculations
            self.img_offset = (self.img_offset[0] + dx, self.img_offset[1] + dy)

    def on_mouse_up(self, event):
        """Finish dragging."""
        if self.dragging_point:
            self.status_label.config(text="Drag points to adjust, drag elsewhere to pan")
        self.dragging_point = None
        self.is_panning = False

    def on_pan_start(self, event):
        """Start panning with right mouse button."""
        self.pan_start = (event.x, event.y)

    def on_pan_drag(self, event):
        """Pan the view with right mouse button."""
        if hasattr(self, 'pan_start'):
            dx = event.x - self.pan_start[0]
            dy = event.y - self.pan_start[1]
            self.pan_offset[0] += dx
            self.pan_offset[1] += dy
            self.pan_start = (event.x, event.y)

            # Move all items on canvas
            self.canvas.move("all", dx, dy)

            # Update img_offset for coordinate calculations
            self.img_offset = (self.img_offset[0] + dx, self.img_offset[1] + dy)

    def on_mouse_wheel(self, event):
        """Zoom with mouse wheel."""
        if event.num == 4 or event.delta > 0:
            self.zoom_level = min(10.0, self.zoom_level * 1.1)
        else:
            self.zoom_level = max(0.3, self.zoom_level / 1.1)
        self.zoom_var.set(self.zoom_level)
        self.rebuild_display()

    def on_zoom_change(self, _=None):
        """Handle zoom slider change."""
        self.zoom_level = self.zoom_var.get()
        self.rebuild_display()

    def set_zoom(self, level):
        """Set zoom to specific level."""
        self.zoom_level = level
        self.zoom_var.set(level)
        self.pan_offset = [0, 0]  # Reset pan when using preset zoom
        self.rebuild_display()

    def on_adjustment_change(self, _=None):
        """Handle image adjustment change."""
        self.rebuild_display()

    def on_toggle_lines(self):
        """Toggle line visibility."""
        self.show_lines = self.show_lines_var.get()
        self.rebuild_display()

    def reset_adjustments(self):
        """Reset image adjustments."""
        self.brightness_var.set(1.0)
        self.contrast_var.set(1.0)
        self.sharpness_var.set(1.0)
        self.rebuild_display()

    def undo_last_point(self):
        """Remove the last placed point."""
        if self.current_point_index > 0:
            self.current_point_index -= 1
            point_name = POINT_NAMES[self.current_point_index]
            if point_name in self.points:
                del self.points[point_name]
            self.update_current_point_display()
            self.rebuild_display()

    def reset_points(self):
        """Clear all points and start over for current leg."""
        self.points = {}
        self.current_point_index = 0
        self.update_current_point_display()
        self.rebuild_display()
        self.status_label.config(text="Points cleared. Click to place first point.")

    def confirm_or_save(self):
        """Confirm current leg or save if both legs done."""
        # Save current leg points (convert to original image coordinates)
        half_w = self.original_size[0] // 2
        x_offset = 0 if self.current_leg == "right" else half_w

        converted = {}
        for name, (x, y) in self.points.items():
            converted[name] = (int(x + x_offset), int(y))

        if self.current_leg == "right":
            self.right_points = converted
            self.current_leg = "left"
            self.load_leg()
            self.confirm_btn.config(text="Save & Next (Enter)")
            self.status_label.config(text="Right leg confirmed. Now adjust left leg.")
        else:
            self.left_points = converted
            self.save_and_next()

    def update_progress(self):
        total = len(self.pending_images) + len(self.annotations.get("images", {}))
        completed = len([img for img, data in self.annotations.get("images", {}).items()
                        if data.get("status") == "completed"])
        self.progress_label.config(text=f"Progress: {completed}/{total}")

    def is_complete(self):
        return len(self.right_points) >= len(POINT_NAMES) and len(self.left_points) >= len(POINT_NAMES)

    def save_and_next(self):
        """Save annotations and move to next image."""
        if not self.pending_images:
            return

        if not self.is_complete():
            messagebox.showwarning("Incomplete", "Please confirm both legs before saving.")
            return

        filename = self.pending_images[self.current_index]

        self.annotations["images"][filename] = {
            "original_width": self.original_size[0],
            "original_height": self.original_size[1],
            "annotated_at": datetime.now().isoformat(),
            "status": "completed",
            "annotation_tool": "manual",
            "left_leg": {name: {"x": x, "y": y} for name, (x, y) in self.left_points.items()},
            "right_leg": {name: {"x": x, "y": y} for name, (x, y) in self.right_points.items()}
        }
        self.save_annotations()

        # Move image to output
        import shutil
        src = EXTRACTED_DIR / filename
        dst = OUTPUT_DIR / filename
        try:
            shutil.move(str(src), str(dst))
        except Exception as e:
            messagebox.showerror("Error", f"Failed to move file: {e}")
            return

        self.pending_images.pop(self.current_index)
        self.update_progress()

        if self.current_index >= len(self.pending_images):
            self.current_index = 0

        if self.pending_images:
            self.load_current_image()
            self.status_label.config(text="Saved! Loading next...")
        else:
            messagebox.showinfo("Complete", "All images have been annotated!")

    def skip_image(self):
        """Skip current image."""
        if not self.pending_images:
            return

        filename = self.pending_images[self.current_index]

        self.annotations["images"][filename] = {
            "status": "skipped",
            "skipped_at": datetime.now().isoformat()
        }
        self.save_annotations()

        import shutil
        src = EXTRACTED_DIR / filename
        dst = SKIPPED_DIR / filename
        try:
            shutil.move(str(src), str(dst))
        except Exception as e:
            messagebox.showerror("Error", f"Failed to move file: {e}")
            return

        self.pending_images.pop(self.current_index)
        self.update_progress()

        if self.current_index >= len(self.pending_images):
            self.current_index = 0

        if self.pending_images:
            self.load_current_image()
            self.status_label.config(text="Skipped. Loading next...")
        else:
            messagebox.showinfo("Complete", "All images have been processed!")


if __name__ == "__main__":
    root = tk.Tk()
    app = AnnotationTool(root)
    root.mainloop()
