FROM public.ecr.aws/lambda/python:3.12

# Install ONNX Runtime and dependencies
# onnxruntime 1.17+ required for ONNX IR version 10 (exported by PyTorch 2.2+)
RUN pip install --no-cache-dir \
    onnxruntime==1.19.2 \
    "numpy<2" \
    pillow

# Copy application code
COPY handler_onnx.py ./handler.py
COPY models/ ./models/

CMD ["handler.handler"]
