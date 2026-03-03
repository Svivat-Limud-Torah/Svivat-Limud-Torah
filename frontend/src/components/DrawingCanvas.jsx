// frontend/src/components/DrawingCanvas.jsx
import React, { useRef, useEffect, useCallback } from 'react';

const DrawingCanvas = ({ strokes, onAddStroke, activeTool, color, lineWidth }) => {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef(null);
  const lastPosRef = useRef(null);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  // Repaint a single stroke onto ctx
  const paintStroke = (ctx, stroke) => {
    if (!stroke.points || stroke.points.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (stroke.tool === 'highlighter') {
      ctx.globalAlpha = 0.38;
      ctx.lineWidth = stroke.lineWidth;
      ctx.strokeStyle = stroke.color;
    } else if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1;
      ctx.lineWidth = stroke.lineWidth;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalAlpha = 1;
      ctx.lineWidth = stroke.lineWidth;
      ctx.strokeStyle = stroke.color;
    }
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  };

  // Full redraw
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach(s => paintStroke(ctx, s));
  }, [strokes]);

  // Resize canvas to fill parent, maintaining pixel size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;
    const resize = () => {
      const { offsetWidth: w, offsetHeight: h } = canvas.parentElement;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        redraw();
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  }, [redraw]);

  // Redraw on strokes change
  useEffect(() => { redraw(); }, [redraw]);

  const onMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas || !activeTool) return;
    e.preventDefault();
    isDrawingRef.current = true;
    const pos = getPos(e, canvas);
    currentStrokeRef.current = { tool: activeTool, color, lineWidth, points: [pos] };
    lastPosRef.current = pos;
  }, [activeTool, color, lineWidth]);

  const onMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawingRef.current || !currentStrokeRef.current) return;
    e.preventDefault();
    const pos = getPos(e, canvas);
    currentStrokeRef.current.points.push(pos);

    // Incremental draw for responsiveness
    const ctx = canvas.getContext('2d');
    const stroke = currentStrokeRef.current;
    ctx.save();
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (stroke.tool === 'highlighter') {
      ctx.globalAlpha = 0.38;
      ctx.lineWidth = stroke.lineWidth;
      ctx.strokeStyle = stroke.color;
    } else if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1;
      ctx.lineWidth = stroke.lineWidth;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalAlpha = 1;
      ctx.lineWidth = stroke.lineWidth;
      ctx.strokeStyle = stroke.color;
    }
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.restore();
    lastPosRef.current = pos;
  }, []);

  const onMouseUp = useCallback(() => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    isDrawingRef.current = false;
    if (currentStrokeRef.current.points.length > 1) {
      onAddStroke(currentStrokeRef.current);
    }
    currentStrokeRef.current = null;
  }, [onAddStroke]);

  const cursor =
    activeTool === 'pencil' ? 'crosshair' :
    activeTool === 'highlighter' ? 'cell' :
    activeTool === 'eraser' ? 'crosshair' : 'default';

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: activeTool ? 'auto' : 'none',
        cursor,
        zIndex: 5,
        touchAction: 'none',
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    />
  );
};

export default DrawingCanvas;
