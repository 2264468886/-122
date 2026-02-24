
import * as echarts from 'echarts';
import { Drawing, DrawingPoint, DrawingType } from '../types';

// TradingView Colors
export const COLORS = {
  ACTIVE: '#2962FF',
  HOVER: '#1E53E5',
  TEXT: '#B2B5BE',
  ANCHOR_FILL: '#FFFFFF',
  ANCHOR_STROKE: '#2962FF',
  FIB_LINES: ['#787B86', '#F23645', '#089981', '#FF9800', '#2962FF']
};

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
export const FIB_EXT_LEVELS = [0, 0.382, 0.5, 0.618, 1, 1.272, 1.618];

/**
 * Converts logical data points to pixel coordinates.
 */
export const pointsToPixels = (
  chart: echarts.ECharts, 
  points: DrawingPoint[], 
  data: any[]
): number[][] | null => {
  // Ensure chart DOM exists
  if (!chart || chart.isDisposed() || !chart.getDom()) return null;

  const pixels = points.map(p => {
    // 1. Try to find exact date match
    let idx = data.findIndex(d => d.date === p.date);
    
    // 2. If not found, fallback to seriesIndex
    if (idx === -1 && p.seriesIndex !== undefined) {
       // Clamp to valid range or allow extrapolation
       idx = p.seriesIndex;
    }
    
    if (idx === -1) return null; 

    // Convert (index, price) -> (x, y)
    // convertToPixel returns (number[] | null | undefined)
    try {
        return chart.convertToPixel({ seriesIndex: 0 }, [idx, p.price]);
    } catch(e) {
        return null;
    }
  });

  // Strict check: if any point failed to convert (null or undefined), abort the whole drawing
  if (pixels.some(p => !p || p.length < 2)) return null;
  return pixels as number[][];
};

/**
 * Generates the ECharts graphic elements for a single drawing.
 * Uses strict ID naming convention:
 * - Hit Area: `hit_${id}`
 * - Anchor: `anchor_${id}_${index}`
 * - Visible Element: `vis_${id}_${part}`
 */
export const getDrawingGraphic = (
  chart: echarts.ECharts,
  drawing: Drawing,
  data: any[],
  isSelected: boolean
): any[] => {
  // Guard against disposed or invalid chart instance
  if (!chart || chart.isDisposed() || !chart.getDom()) return [];

  try {
      const pixels = pointsToPixels(chart, drawing.points, data);
      // Add safety check for empty pixels array to prevent undefined access
      if (!pixels || pixels.length === 0) return [];

      const elements: any[] = [];
      const { id, type, style } = drawing;
      const color = isSelected ? COLORS.ACTIVE : (style.color || COLORS.ACTIVE);
      const lineWidth = style.lineWidth || 2;
      const lineType = style.lineType || 'solid';

      // Base configuration for visible elements
      const visibleCommon = {
        z: 100, // Visible layer
        silent: true, // Visible thin lines do NOT catch events
      };

      // Helper: Create an invisible wide line for easy clicking/dragging
      const createHitLine = (x1: number, y1: number, x2: number, y2: number, subId = '') => ({
        type: 'line',
        id: `hit_${id}${subId}`, 
        z: 105, 
        silent: false, 
        shape: { x1, y1, x2, y2 },
        style: { stroke: 'rgba(0,0,0,0)', lineWidth: 15 }, 
        cursor: 'move',
        draggable: false
      });

      // Wrap dimension access
      let chartWidth = 0;
      let chartHeight = 0;
      try {
          chartWidth = chart.getWidth();
          chartHeight = chart.getHeight();
      } catch(e) {
          return []; // If we can't get dimensions, we can't draw things that depend on them
      }

      // --- 1. Lines (Trend, Ray, Extended, Arrow, VLine, HLine) ---
      if (['trend', 'ray', 'extended', 'arrow', 'vline', 'hline'].includes(type)) {
        let [p1, p2] = pixels;
        
        // Safety check: ensure p1 exists before accessing properties
        if (!p1) return elements;

        // Handle Infinite Lines
        if (type === 'hline' && p1) {
          p1 = [0, p1[1]];
          p2 = [chartWidth, p1[1]];
        } else if (type === 'vline' && p1) {
          p1 = [p1[0], 0];
          p2 = [p1[0], chartHeight];
        } else if (!p2) {
          p2 = p1; // Single point fallback
        }

        // Calculations for Ray/Extended logic
        if (p1 && p2 && (type === 'ray' || type === 'extended')) {
           const w = chartWidth;
           const h = chartHeight;
           const dx = p2[0] - p1[0];
           const dy = p2[1] - p1[1];
           
           if (dx !== 0 || dy !== 0) {
             const m = dy / dx;
             const b = p1[1] - m * p1[0];

             if (type === 'ray') {
                if (dx > 0) { p2 = [w, m * w + b]; } 
                else if (dx < 0) { p2 = [0, b]; }
                else if (dy > 0) { p2 = [p1[0], h]; }
                else { p2 = [p1[0], 0]; }
             } else if (type === 'extended') {
                p1 = [0, b];
                p2 = [w, m * w + b];
             }
           }
        }

        // A. Render Visible Line
        elements.push({
          type: 'line',
          id: `vis_${id}_line`,
          ...visibleCommon,
          shape: { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] },
          style: {
            stroke: color,
            lineWidth: lineWidth,
            lineDash: lineType === 'dashed' ? [6, 4] : lineType === 'dotted' ? [2, 2] : undefined
          }
        });

        // B. Render Invisible Hit Area
        elements.push(createHitLine(p1[0], p1[1], p2[0], p2[1]));

        // C. Arrow Head
        if (type === 'arrow' && p1 && p2) {
           const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
           const headLen = 14;
           elements.push({
             type: 'polygon',
             id: `vis_${id}_arrow`,
             ...visibleCommon,
             shape: {
               points: [
                 [p2[0] - headLen * Math.cos(angle - Math.PI / 6), p2[1] - headLen * Math.sin(angle - Math.PI / 6)],
                 [p2[0], p2[1]],
                 [p2[0] - headLen * Math.cos(angle + Math.PI / 6), p2[1] - headLen * Math.sin(angle + Math.PI / 6)]
               ]
             },
             style: { fill: color }
           });
           elements.push({
              type: 'circle', 
              id: `hit_${id}_arrow`,
              z: 105, silent: false,
              shape: { cx: p2[0], cy: p2[1], r: 15 },
              style: { fill: 'rgba(0,0,0,0)' },
              cursor: 'move'
           });
        }
      }

      // --- 2. Shapes (Rect) ---
      else if (type === 'rect' && pixels.length > 1) {
        const [p1, p2] = pixels;
        const x = Math.min(p1[0], p2[0]);
        const y = Math.min(p1[1], p2[1]);
        const w = Math.abs(p2[0] - p1[0]);
        const h = Math.abs(p2[1] - p1[1]);
        
        elements.push({
          type: 'rect',
          id: `vis_${id}_rect`,
          ...visibleCommon,
          shape: { x, y, width: w, height: h },
          style: {
            stroke: color,
            lineWidth: lineWidth,
            fill: color + '20' 
          }
        });

        elements.push({
          type: 'rect',
          id: `hit_${id}`,
          z: 105,
          silent: false,
          shape: { x, y, width: w, height: h },
          style: { fill: 'rgba(0,0,0,0)', stroke: 'rgba(0,0,0,0)', lineWidth: 10 }, 
          cursor: 'move'
        });
      }
      
      // --- 3. Circle ---
      else if (type === 'circle' && pixels.length > 1) {
          const [p1, p2] = pixels;
          const r = Math.sqrt(Math.pow(p2[0]-p1[0], 2) + Math.pow(p2[1]-p1[1], 2));
          
          elements.push({
              type: 'circle',
              id: `vis_${id}_circle`,
              ...visibleCommon,
              shape: { cx: p1[0], cy: p1[1], r },
              style: { stroke: color, lineWidth, fill: 'transparent' }
          });

          elements.push({
              type: 'circle',
              id: `hit_${id}`,
              z: 105,
              silent: false,
              shape: { cx: p1[0], cy: p1[1], r },
              style: { stroke: 'rgba(0,0,0,0)', lineWidth: 12, fill: 'transparent' }, 
              cursor: 'move'
          });
      }

      // --- 4. Triangle ---
      else if (type === 'triangle' && pixels.length > 1) {
          const pts = pixels.map(p => [...p]);
          // If incomplete (2 pts), we can still draw a line or partial fill
          if (pts.length === 2) pts.push([...pts[1]]);
          
          elements.push({
              type: 'polygon',
              id: `vis_${id}_tri`,
              ...visibleCommon,
              shape: { points: pts },
              style: { stroke: color, lineWidth, fill: color + '20' }
          });

          elements.push({
              type: 'polygon',
              id: `hit_${id}`,
              z: 105, silent: false,
              shape: { points: pts },
              style: { fill: 'rgba(0,0,0,0)', stroke: 'rgba(0,0,0,0)', lineWidth: 10 },
              cursor: 'move'
          });
      }

      // --- 5. Parallel Channel ---
      else if (type === 'channel' && pixels.length > 1) {
          const [p1, p2, p3] = pixels;
          // Line 1: p1 -> p2
          // Line 2: Parallel passing through p3
          // We need to find p4 to close the polygon
          
          // Vector p1->p2
          const dx = p2[0] - p1[0];
          const dy = p2[1] - p1[1];
          
          const p3Exists = !!p3;
          const p3_real = p3 || p2; // Fallback for preview
          
          const p4 = [p3_real[0] + dx, p3_real[1] + dy];
          
          // Draw Polygon Fill
          elements.push({
              type: 'polygon',
              id: `vis_${id}_fill`,
              ...visibleCommon,
              z: 90, // Behind lines
              shape: { points: [p1, p2, p4, p3_real] },
              style: { fill: color + '15', stroke: 'none' }
          });
          
          // Draw Line 1 (P1-P2)
          elements.push({
              type: 'line', id: `vis_${id}_l1`, ...visibleCommon,
              shape: { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] },
              style: { stroke: color, lineWidth }
          });
          
          // Draw Line 2 (P3-P4)
          elements.push({
              type: 'line', id: `vis_${id}_l2`, ...visibleCommon,
              shape: { x1: p3_real[0], y1: p3_real[1], x2: p4[0], y2: p4[1] },
              style: { stroke: color, lineWidth }
          });
          
          // Dashed connector (optional, improves UX)
          elements.push({
              type: 'line', id: `vis_${id}_conn`, ...visibleCommon,
              shape: { x1: (p1[0]+p2[0])/2, y1: (p1[1]+p2[1])/2, x2: (p3_real[0]+p4[0])/2, y2: (p3_real[1]+p4[1])/2 },
              style: { stroke: color, lineWidth: 1, lineDash: [4, 4], opacity: 0.5 }
          });

          // Hit Area (Entire Polygon)
          elements.push({
              type: 'polygon', id: `hit_${id}`, z: 105, silent: false,
              shape: { points: [p1, p2, p4, p3_real] },
              style: { fill: 'rgba(0,0,0,0)', stroke: 'rgba(0,0,0,0)', lineWidth: 10 },
              cursor: 'move'
          });
      }

      // --- 6. Pitchfork ---
      else if (type === 'pitchfork' && pixels.length > 1) {
          const [p1, p2, p3] = pixels;
          const p3_real = p3 || p2;
          
          // Midpoint of P2-P3
          const mid = [(p2[0] + p3_real[0])/2, (p2[1] + p3_real[1])/2];
          
          // Handle vector from P1 to Mid
          // Extend lines infinitely or to screen edge? Let's extend reasonably far (e.g. 2x width)
          const w = chartWidth;
          const dx = mid[0] - p1[0];
          const dy = mid[1] - p1[1];
          
          const extendFactor = 100; // Big number to simulate infinite
          const p1_end = [p1[0] + dx * extendFactor, p1[1] + dy * extendFactor];
          const p2_end = [p2[0] + dx * extendFactor, p2[1] + dy * extendFactor];
          const p3_end = [p3_real[0] + dx * extendFactor, p3_real[1] + dy * extendFactor];

          // Draw Median Line
          elements.push({ type: 'line', id: `vis_${id}_mid`, ...visibleCommon, shape: { x1: p1[0], y1: p1[1], x2: p1_end[0], y2: p1_end[1] }, style: { stroke: color, lineWidth } });
          
          // Draw Upper/Lower Lines
          elements.push({ type: 'line', id: `vis_${id}_u`, ...visibleCommon, shape: { x1: p2[0], y1: p2[1], x2: p2_end[0], y2: p2_end[1] }, style: { stroke: color, lineWidth } });
          elements.push({ type: 'line', id: `vis_${id}_l`, ...visibleCommon, shape: { x1: p3_real[0], y1: p3_real[1], x2: p3_end[0], y2: p3_end[1] }, style: { stroke: color, lineWidth } });

          // Handle Line (P2-P3)
          elements.push({ type: 'line', id: `vis_${id}_h`, ...visibleCommon, shape: { x1: p2[0], y1: p2[1], x2: p3_real[0], y2: p3_real[1] }, style: { stroke: color, lineWidth: 1, lineDash: [4,4] } });

          // Hit Area (Center Line)
          elements.push(createHitLine(p1[0], p1[1], p1_end[0], p1_end[1]));
      }

      // --- 7. Polyline (Path) ---
      else if (type === 'path' && pixels.length > 0) {
          elements.push({
              type: 'polyline',
              id: `vis_${id}_poly`,
              ...visibleCommon,
              shape: { points: pixels },
              style: { stroke: color, lineWidth, fill: 'none' }
          });
          
          // Hit lines for each segment
          for(let i=0; i<pixels.length-1; i++) {
              elements.push(createHitLine(pixels[i][0], pixels[i][1], pixels[i+1][0], pixels[i+1][1], `_${i}`));
          }
      }

      // --- 8. Fibonacci Retracement ---
      else if (type === 'fib_ret' && pixels.length > 1) {
         const [p1, p2] = pixels;
         const yDiff = p2[1] - p1[1];
         const xStart = Math.min(p1[0], p2[0]);
         const xEnd = Math.max(p1[0], p2[0]);

         FIB_LEVELS.forEach((level, i) => {
            const y = p1[1] + yDiff * level;
            const levelColor = isSelected ? color : FIB_LEVELS[i] === 0.5 ? '#089981' : FIB_LEVELS[i] === 0.618 ? '#F23645' : '#787B86';
            
            elements.push({
                type: 'line', id: `vis_${id}_fib_${i}`, ...visibleCommon,
                shape: { x1: xStart, y1: y, x2: xEnd, y2: y },
                style: { stroke: levelColor, lineWidth: 1, lineDash: [4, 2] }
            });
            
            elements.push(createHitLine(xStart, y, xEnd, y, `_fib_${i}`));
         });
         
         // Diagonal
         elements.push({
             type: 'line', id: `vis_${id}_diag`, ...visibleCommon,
             shape: { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] },
             style: { stroke: color, lineWidth: 1, lineDash: [2, 2], opacity: 0.5 }
         });
         elements.push(createHitLine(p1[0], p1[1], p2[0], p2[1], '_diag'));
      }

      // --- 9. Fibonacci Extension ---
      else if (type === 'fib_ext' && pixels.length > 1) {
         const [p1, p2, p3] = pixels;
         const p3_real = p3 || p2; // fallback

         // Base vertical range from P1 to P2
         const rangeY = p2[1] - p1[1];
         
         // Width? Standard extends to right. Let's use P2.x - P1.x as base width reference, or extend to chart width
         const w = chartWidth;
         const xStart = p3_real[0];
         const xEnd = w; 

         FIB_EXT_LEVELS.forEach((level, i) => {
            const y = p3_real[1] + rangeY * level;
            const levelColor = isSelected ? color : level === 1 ? '#089981' : level === 1.618 ? '#F23645' : '#787B86';
            
            elements.push({
                type: 'line', id: `vis_${id}_fibex_${i}`, ...visibleCommon,
                shape: { x1: xStart, y1: y, x2: xEnd, y2: y },
                style: { stroke: levelColor, lineWidth: 1 }
            });
            
            // Label
            elements.push({
                type: 'text', id: `lbl_${id}_${i}`, ...visibleCommon,
                x: xStart + 5, y: y - 10,
                style: { text: level.toString(), fill: levelColor, fontSize: 10 }
            });

            elements.push(createHitLine(xStart, y, xEnd, y, `_fibex_${i}`));
         });
         
         // Connection lines
         elements.push({
             type: 'polyline', id: `vis_${id}_conn`, ...visibleCommon,
             shape: { points: [p1, p2, p3_real] },
             style: { stroke: color, lineWidth: 1, lineDash: [2, 2], opacity: 0.5 }
         });
      }

      // --- 10. Text ---
      else if (type === 'text' && pixels.length > 0) {
          const [p1] = pixels;
          elements.push({
              type: 'text', id: `hit_${id}`, z: 106, silent: false,
              x: p1[0], y: p1[1],
              style: {
                  text: style.text || 'Text', fill: color, fontSize: style.fontSize || 14,
                  fontFamily: 'sans-serif', fontWeight: 'bold'
              },
              cursor: 'move'
          });
      }

      // --- 11. Selection Anchors ---
      if (isSelected) {
          pixels.forEach((p, i) => {
              elements.push({
                  id: `anchor_${id}_${i}`, type: 'circle', z: 110, 
                  shape: { cx: p[0], cy: p[1], r: 5 }, 
                  style: { fill: COLORS.ANCHOR_FILL, stroke: COLORS.ANCHOR_STROKE, lineWidth: 1.5 },
                  silent: false, cursor: 'crosshair', draggable: false 
              });
              
              elements.push({
                  id: `anchor_hit_${id}_${i}`, type: 'circle', z: 111, silent: false,
                  shape: { cx: p[0], cy: p[1], r: 12 },
                  style: { fill: 'rgba(0,0,0,0)' },
                  cursor: 'crosshair', draggable: false
              });
          });
      }

      return elements;
  } catch (e) {
      console.warn('ECharts Graphic Generation Error:', e);
      return [];
  }
};
