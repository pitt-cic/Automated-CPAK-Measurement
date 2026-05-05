FROM public.ecr.aws/lambda/python:3.11

# Install ONNX Runtime and dependencies (much faster than PyTorch)
RUN pip install --no-cache-dir \
    onnxruntime==1.16.3 \
    "numpy<2" \
    pillow

# Copy application code
COPY handler_onnx.py ./handler.py
COPY models/ ./models/

CMD ["handler.handler"]
