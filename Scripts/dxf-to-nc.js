function parseDxf(dxfString) {
  const lines = dxfString.split(/\r?\n/);
  const result = {
    lines: [],
    arcs: [],
    circles: [],
    texts: [],
    rects: [],
  };

  let i = 0;
  let inEntitiesSection = false;
  let currentEntity = null;

  // Helper to convert degrees to radians
  const degToRad = (degrees) => degrees * (Math.PI / 180);

  // Helper to process and push the completed entity
  const finalizeEntity = () => {
    if (!currentEntity) return;

    switch (currentEntity.type) {
      case 'LINE':
        if (currentEntity.p1 && currentEntity.p2) {
          result.lines.push({
            type: 'LINE',
            start: { x: currentEntity.p1.x, y: currentEntity.p1.y },
            end: { x: currentEntity.p2.x, y: currentEntity.p2.y },
          });
        }
        break;
      case 'CIRCLE':
        if (currentEntity.center && currentEntity.radius) {
          result.circles.push({
            type: 'CIRCLE',
            center: { x: currentEntity.center.x, y: currentEntity.center.y },
            radius: currentEntity.radius,
          });
        }
        break;
      case 'ARC':
         if (currentEntity.center && currentEntity.radius && currentEntity.startAngle !== undefined && currentEntity.endAngle !== undefined) {
          // Convert angles from degrees to radians before calculating points
          const startAngleRad = degToRad(currentEntity.startAngle);
          const endAngleRad = degToRad(currentEntity.endAngle);
          
          // Calculate start and end points from center, radius, and angles
          const startPoint = {
            x: currentEntity.center.x + currentEntity.radius * Math.cos(startAngleRad),
            y: currentEntity.center.y + currentEntity.radius * Math.sin(startAngleRad)
          };

          const endPoint = {
            x: currentEntity.center.x + currentEntity.radius * Math.cos(endAngleRad),
            y: currentEntity.center.y + currentEntity.radius * Math.sin(endAngleRad)
          };
          result.arcs.push({
            type: 'ARC',
            radius: currentEntity.radius,
            startPoint: startPoint,
            endPoint: endPoint
          });
        }
        break;
      case 'TEXT':
        if (currentEntity.text && currentEntity.position) {
            result.texts.push({
                type: 'TEXT',
                text: currentEntity.text,
                position: { x: currentEntity.position.x, y: currentEntity.position.y },
                height: currentEntity.height || 0,
            });
        }
        break;
      case 'LWPOLYLINE':
        // Check if it's a closed rectangle
        if (currentEntity.closed && currentEntity.vertices && currentEntity.vertices.length === 4) {
            const vertices = currentEntity.vertices;

            // Find the bottom-left corner
            let bl_index = 0;
            for(let j = 1; j < 4; j++) {
                if (vertices[j].y < vertices[bl_index].y) {
                    bl_index = j;
                } else if (vertices[j].y === vertices[bl_index].y && vertices[j].x < vertices[bl_index].x) {
                    bl_index = j;
                }
            }
            const bottomLeft = vertices[bl_index];

            // Find adjacent vertices
            const prev_v = vertices[(bl_index + 3) % 4];
            const next_v = vertices[(bl_index + 1) % 4];

            // Create vectors from the bottom-left corner
            const vec1 = { x: next_v.x - bottomLeft.x, y: next_v.y - bottomLeft.y };
            const vec2 = { x: prev_v.x - bottomLeft.x, y: prev_v.y - bottomLeft.y };

            // Calculate angles and lengths
            const angle1 = Math.atan2(vec1.y, vec1.x);
            const len1 = Math.sqrt(vec1.x * vec1.x + vec1.y * vec1.y);
            const angle2 = Math.atan2(vec2.y, vec2.x);
            const len2 = Math.sqrt(vec2.x * vec2.x + vec2.y * vec2.y);

            // Determine rotation, length, and height
            let rotation, length, height;
            if (angle1 < angle2) {
                rotation = angle1;
                length = len1;
                height = len2;
            } else {
                rotation = angle2;
                length = len2;
                height = len1;
            }

            result.rects.push({
                type: 'RECT',
                x: bottomLeft.x,
                y: bottomLeft.y,
                length: length,
                height: height,
                angle: rotation * (180 / Math.PI), // Angle in degrees
            });
        }
        break;
    }
  };


  while (i < lines.length) {
    const groupCode = parseInt(lines[i].trim(), 10);
    const value = lines[i + 1] ? lines[i + 1].trim() : '';
    i += 2;

    if (groupCode === 0 && value === 'SECTION') {
        const sectionNameCode = parseInt(lines[i].trim(), 10);
        const sectionName = lines[i+1] ? lines[i+1].trim() : '';
        if(sectionNameCode === 2 && sectionName === 'ENTITIES') {
            inEntitiesSection = true;
        }
    }

    if (groupCode === 0 && value === 'ENDSEC') {
        inEntitiesSection = false;
        continue;
    }

    if (!inEntitiesSection) {
        continue;
    }

    if (groupCode === 0) {
      finalizeEntity();
      currentEntity = { type: value, vertices: [] };
      continue;
    }

    if (!currentEntity) continue;

    switch (groupCode) {
      case 1: currentEntity.text = value; break;
      case 8: currentEntity.layer = value; break;
      case 10:
        if (currentEntity.type === 'LWPOLYLINE') {
            currentEntity.vertices.push({ x: parseFloat(value) });
        } else {
            currentEntity.p1 = currentEntity.p1 || {}; currentEntity.p1.x = parseFloat(value);
            currentEntity.center = currentEntity.center || {}; currentEntity.center.x = parseFloat(value);
            currentEntity.position = currentEntity.position || {}; currentEntity.position.x = parseFloat(value);
        }
        break;
      case 20:
        if (currentEntity.type === 'LWPOLYLINE') {
            const lastVertex = currentEntity.vertices[currentEntity.vertices.length - 1];
            if (lastVertex && lastVertex.y === undefined) { lastVertex.y = parseFloat(value); }
        } else {
            currentEntity.p1 = currentEntity.p1 || {}; currentEntity.p1.y = parseFloat(value);
            currentEntity.center = currentEntity.center || {}; currentEntity.center.y = parseFloat(value);
            currentEntity.position = currentEntity.position || {}; currentEntity.position.y = parseFloat(value);
        }
        break;
      case 11: currentEntity.p2 = currentEntity.p2 || {}; currentEntity.p2.x = parseFloat(value); break;
      case 21: currentEntity.p2 = currentEntity.p2 || {}; currentEntity.p2.y = parseFloat(value); break;
      case 40:
        currentEntity.radius = parseFloat(value);
        currentEntity.height = parseFloat(value);
        break;
      case 50: currentEntity.startAngle = parseFloat(value); break;
      case 51: currentEntity.endAngle = parseFloat(value); break;
      case 70: if (parseInt(value, 10) & 1) { currentEntity.closed = true; } break; // Bitwise check for closed flag
      case 90: currentEntity.vertexCount = parseInt(value, 10); break;
    }
  }

  finalizeEntity(); // Finalize the very last entity in the file

  return result;
}

function findContour(parsedData) {
  // Helper function to get all points from a shape
  const getShapePoints = (shape) => {
    switch (shape.type) {
      case 'LINE':
        return [shape.start, shape.end];
      case 'ARC':
        return [shape.startPoint, shape.endPoint];
      case 'CIRCLE':
        // Skip circles for contour detection
        return [];
      case 'RECT':
        // Calculate rectangle corners based on position, length, height, and angle
        const cos = Math.cos(shape.angle * Math.PI / 180);
        const sin = Math.sin(shape.angle * Math.PI / 180);
        
        const corners = [
          { x: shape.x, y: shape.y }, // bottom-left
          { x: shape.x + shape.length * cos, y: shape.y + shape.length * sin }, // bottom-right
          { x: shape.x + shape.length * cos - shape.height * sin, y: shape.y + shape.length * sin + shape.height * cos }, // top-right
          { x: shape.x - shape.height * sin, y: shape.y + shape.height * cos } // top-left
        ];
        return corners;
      default:
        return [];
    }
  };

  // Helper function to check if two points are approximately equal
  const pointsEqual = (p1, p2, tolerance = 0.001) => {
    return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
  };

  // Helper function to find the point with lowest x, then lowest y
  const findLowestPoint = (shapes) => {
    let lowestPoint = null;
    let lowestShape = null;
    
    shapes.forEach(shape => {
      const points = getShapePoints(shape);
      points.forEach(point => {
        if (!lowestPoint || 
            point.x < lowestPoint.x || 
            (point.x === lowestPoint.x && point.y < lowestPoint.y)) {
          lowestPoint = point;
          lowestShape = shape;
        }
      });
    });
    
    return { point: lowestPoint, shape: lowestShape };
  };

  // Helper function to get the other point of a shape given one point
  const getOtherPoint = (shape, knownPoint) => {
    const points = getShapePoints(shape);
    if (points.length === 2) {
      // For lines and arcs
      if (pointsEqual(points[0], knownPoint)) {
        return points[1];
      } else if (pointsEqual(points[1], knownPoint)) {
        return points[0];
      }
    } else if (points.length === 4) {
      // For rectangles, find the next point in sequence
      for (let i = 0; i < points.length; i++) {
        if (pointsEqual(points[i], knownPoint)) {
          return points[(i + 1) % points.length];
        }
      }
    }
    return null;
  };

  // Helper function to find a shape that contains a specific point
  const findShapeContainingPoint = (shapes, targetPoint, excludeShape = null) => {
    return shapes.find(shape => {
      if (shape === excludeShape) return false;
      
      const points = getShapePoints(shape);
      return points.some(point => pointsEqual(point, targetPoint));
    });
  };

  // Get all shapes that can form contours (exclude circles and texts)
  const contourShapes = [
    ...parsedData.lines,
    ...parsedData.arcs,
    ...parsedData.rects
  ];

  if (contourShapes.length === 0) {
    return false;
  }

  // Find the starting point (lowest x, then lowest y)
  const startResult = findLowestPoint(contourShapes);
  if (!startResult.point || !startResult.shape) {
    return false;
  }

  const startPoint = startResult.point;
  const startShape = startResult.shape;
  
  // Track the contour
  const contourShapes_found = [startShape];
  let currentShape = startShape;
  let currentPoint = getOtherPoint(startShape, startPoint);
  
  if (!currentPoint) {
    return false;
  }

  // Follow the contour
  while (true) {
    // Find the next shape that contains the current point
    const nextShape = findShapeContainingPoint(contourShapes, currentPoint, currentShape);
    
    if (!nextShape) {
      // No connecting shape found, not a closed contour
      return false;
    }
    
    // Check if closed contour condition is met
    if (nextShape === startShape) {
      // Verify that the current point connects back to the start point
      const points = getShapePoints(startShape);
      if (pointsEqual(currentPoint, startPoint)) {
        // Successfully found a closed contour
        break;
      } else {
        // Current point doesn't connect properly to start
        return false;
      }
    }
    
    // Check if shape already been visited (infinite loop detection)
    if (contourShapes_found.includes(nextShape)) {
      return false;
    }
    
    // Add to contour and move to next point
    contourShapes_found.push(nextShape);
    currentShape = nextShape;
    currentPoint = getOtherPoint(nextShape, currentPoint);
    
    if (!currentPoint) {
      return false;
    }
  }

  // If contour found, tag the shapes
  if (contourShapes_found.length > 0) {
    // Create a deep copy of the parsed data
    const result = JSON.parse(JSON.stringify(parsedData));
    
    // Tag contour shapes
    contourShapes_found.forEach(shape => {
      // Find the corresponding shape in the result and tag it
      const findAndTag = (shapeArray) => {
        const index = parsedData.lines.indexOf(shape);
        if (index !== -1) {
          result.lines[index].contour = true;
          return true;
        }
        
        const arcIndex = parsedData.arcs.indexOf(shape);
        if (arcIndex !== -1) {
          result.arcs[arcIndex].contour = true;
          return true;
        }
        
        const rectIndex = parsedData.rects.indexOf(shape);
        if (rectIndex !== -1) {
          result.rects[rectIndex].contour = true;
          return true;
        }
        
        return false;
      };
      
      findAndTag();
    });
    
    return result;
  }

  return false;
}

function getPartDimensions(shapes) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  // Helper function to update bounds with a point
  const updateBounds = (x, y) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  };

  // Process lines
  shapes.lines.forEach(line => {
    updateBounds(line.start.x, line.start.y);
    updateBounds(line.end.x, line.end.y);
  });

  // Process circles
  shapes.circles.forEach(circle => {
    updateBounds(circle.center.x - circle.radius, circle.center.y - circle.radius);
    updateBounds(circle.center.x + circle.radius, circle.center.y + circle.radius);
  });

  // Process arcs
  shapes.arcs.forEach(arc => {
    updateBounds(arc.startPoint.x, arc.startPoint.y);
    updateBounds(arc.endPoint.x, arc.endPoint.y);
  });

  // Process text
  shapes.texts.forEach(text => {
    updateBounds(text.position.x, text.position.y);
  });

  // Process rectangles
  shapes.rects.forEach(rect => {
    const cos = Math.cos(rect.angle * Math.PI / 180);
    const sin = Math.sin(rect.angle * Math.PI / 180);
    
    // Calculate all four corners of the rotated rectangle
    const corners = [
      { x: 0, y: 0 }, // bottom-left (relative to rect origin)
      { x: rect.length, y: 0 }, // bottom-right
      { x: rect.length, y: rect.height }, // top-right
      { x: 0, y: rect.height } // top-left
    ];

    corners.forEach(corner => {
      // Apply rotation and translation
      const rotatedX = corner.x * cos - corner.y * sin + rect.x;
      const rotatedY = corner.x * sin + corner.y * cos + rect.y;
      updateBounds(rotatedX, rotatedY);
    });
  });

  // Check if we found any shapes
  if (minX === Infinity || maxX === -Infinity || minY === Infinity || maxY === -Infinity) {
    return {
      width: 0,
      height: 0,
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0
    };
  }

  return {
    width: maxX - minX,
    height: maxY - minY,
  };
}

function getInputValue(inputId) {
    const input = document.getElementById(inputId);
    return input.value.trim();
}

function convertDxfToNc(dxfFileData, fileName) {
  const parsedData = parseDxf(dxfFileData);
  const contourData = findContour(parsedData);
  const partDimensions = getPartDimensions(parsedData);
  if (!contourData) {
    console.error('No valid contour found in the DXF data.');
    return null;
  }
  let ncContent = [
        'ST',
        `** Created by OpenSteel on ${new Date().toLocaleDateString()}`,
        getInputValue('dxfOrderInput'),
        getInputValue('dxfDrawingInput'),
        getInputValue('dxfPhaseInput'),
        fileName.replace(/\.nc1$/, ""),
        getInputValue('dxfGradeInput'),
        getInputValue('dxfQuantityInput'),
        'PL',
        'B',
        partDimensions.length.toFixed(2),
        partDimensions.height.toFixed(2),
        getInputValue('dxfThicknessInput'),
        getInputValue('dxfThicknessInput'),
        getInputValue('dxfThicknessInput'),
        '0.00',
        '0.00',
        '0.00',
        '0.00',
        '0.00',
        '0.00',
        '0.00',
        '',
        '',
        '',
        'EN'
    ].join('\n');

  return contourData;
}