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

  // Helper to determine arc direction
  const getArcDirection = (startAngle, endAngle) => {
    // Normalize angles to [0, 360)
    const start = (startAngle % 360 + 360) % 360;
    const end = (endAngle % 360 + 360) % 360;
    // Calculate angular difference
    let delta = end - start;
    if (delta < 0) delta += 360;
    return delta <= 180 ? 1 : -1;
  };

  // Helper to check if two points are approximately equal
  const pointsEqual = (p1, p2, tolerance = 0.0001) => {
    return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
  };

  // Helper to check if two arcs form a complete circle
  const checkAndCombineArcs = () => {
    const arcsToRemove = [];
    
    for (let i = 0; i < result.arcs.length; i++) {
      for (let j = i + 1; j < result.arcs.length; j++) {
        const arc1 = result.arcs[i];
        const arc2 = result.arcs[j];
        
        // Check if they have the same center point and radius
        if (pointsEqual(arc1.center, arc2.center) && 
            Math.abs(arc1.radius - arc2.radius) < 0.0001) {
          
          // Check if one arc's end point matches the other's start point
          const arc1EndMatchesArc2Start = pointsEqual(arc1.endPoint, arc2.startPoint);
          const arc2EndMatchesArc1Start = pointsEqual(arc2.endPoint, arc1.startPoint);
          
          if (arc1EndMatchesArc2Start && arc2EndMatchesArc1Start) {
            // These two arcs can be combined into a complete circle
            result.circles.push({
              type: 'CIRCLE',
              center: { x: arc1.center.x, y: arc1.center.y },
              radius: arc1.radius,
            });
            
            // Mark these arcs for removal
            arcsToRemove.push(i, j);
            break; // Break when match is found
          }
        }
      }
    }
    
    // Remove the arcs that were combined into circles (in reverse order to maintain indices)
    const uniqueIndices = [...new Set(arcsToRemove)].sort((a, b) => b - a);
    uniqueIndices.forEach(index => {
      result.arcs.splice(index, 1);
    });
  };

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
          // Determine direction
          const direction = getArcDirection(currentEntity.startAngle, currentEntity.endAngle);
          result.arcs.push({
            type: 'ARC',
            center: { x: currentEntity.center.x, y: currentEntity.center.y },
            radius: currentEntity.radius,
            startPoint: startPoint,
            endPoint: endPoint,
            direction: direction
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
                rotation: currentEntity.rotation || 0,
            });
        }
        break;
      case 'LWPOLYLINE':
      case 'POLYLINE':
        if (currentEntity.vertices && currentEntity.vertices.length >= 2) {
          // Check if it's a closed rectangle (4 vertices)
          if (currentEntity.closed && currentEntity.vertices.length === 4) {
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
          } else {
            // Convert polyline to individual line segments
            for (let j = 0; j < currentEntity.vertices.length - 1; j++) {
              result.lines.push({
                type: 'LINE',
                start: { x: currentEntity.vertices[j].x, y: currentEntity.vertices[j].y },
                end: { x: currentEntity.vertices[j + 1].x, y: currentEntity.vertices[j + 1].y },
              });
            }
            
            // If closed, add a line from the last vertex back to the first
            if (currentEntity.closed && currentEntity.vertices.length > 2) {
              result.lines.push({
                type: 'LINE',
                start: { x: currentEntity.vertices[currentEntity.vertices.length - 1].x, y: currentEntity.vertices[currentEntity.vertices.length - 1].y },
                end: { x: currentEntity.vertices[0].x, y: currentEntity.vertices[0].y },
              });
            }
          }
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
        if (currentEntity.type === 'LWPOLYLINE' || currentEntity.type === 'POLYLINE') {
            currentEntity.vertices.push({ x: parseFloat(value) });
        } else {
            currentEntity.p1 = currentEntity.p1 || {}; currentEntity.p1.x = parseFloat(value);
            currentEntity.center = currentEntity.center || {}; currentEntity.center.x = parseFloat(value);
            currentEntity.position = currentEntity.position || {}; currentEntity.position.x = parseFloat(value);
        }
        break;
      case 20:
        if (currentEntity.type === 'LWPOLYLINE' || currentEntity.type === 'POLYLINE') {
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
      case 50: 
        if (currentEntity.type === 'ARC') {
        currentEntity.startAngle = parseFloat(value);
        } else if (currentEntity.type === 'TEXT') {
          currentEntity.rotation = parseFloat(value);
        }
        break;
      case 51: currentEntity.endAngle = parseFloat(value); break;
      case 70: if (parseInt(value, 10) & 1) { currentEntity.closed = true; } break; // Bitwise check for closed flag
      case 90: currentEntity.vertexCount = parseInt(value, 10); break;
    }
  }

  finalizeEntity(); // Finalize the very last entity in the file

  // Check for arcs that can be combined into circles
  checkAndCombineArcs();

  // Find the minimum x and y values across all shapes
  let minX = Infinity;
  let minY = Infinity;

  // Check lines
  result.lines.forEach(line => {
    minX = Math.min(minX, line.start.x, line.end.x);
    minY = Math.min(minY, line.start.y, line.end.y);
  });

  // Check circles (consider the leftmost and bottommost points)
  result.circles.forEach(circle => {
    minX = Math.min(minX, circle.center.x - circle.radius);
    minY = Math.min(minY, circle.center.y - circle.radius);
  });

  // Check arcs (consider center, start, and end points)
  result.arcs.forEach(arc => {
    minX = Math.min(minX, arc.center.x - arc.radius, arc.startPoint.x, arc.endPoint.x);
    minY = Math.min(minY, arc.center.y - arc.radius, arc.startPoint.y, arc.endPoint.y);
  });

  // Check texts
  result.texts.forEach(text => {
    minX = Math.min(minX, text.position.x);
    minY = Math.min(minY, text.position.y);
  });

  // Check rectangles
  result.rects.forEach(rect => {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
  });

  // If no shapes were found, set defaults
  if (minX === Infinity) minX = 0;
  if (minY === Infinity) minY = 0;

  // Translate all shapes by subtracting the minimum values
  if (minX !== 0 || minY !== 0) {
    // Translate lines
    result.lines.forEach(line => {
      line.start.x -= minX;
      line.start.y -= minY;
      line.end.x -= minX;
      line.end.y -= minY;
    });

    // Translate circles
    result.circles.forEach(circle => {
      circle.center.x -= minX;
      circle.center.y -= minY;
    });

    // Translate arcs
    result.arcs.forEach(arc => {
      arc.center.x -= minX;
      arc.center.y -= minY;
      arc.startPoint.x -= minX;
      arc.startPoint.y -= minY;
      arc.endPoint.x -= minX;
      arc.endPoint.y -= minY;
    });

    // Translate texts
    result.texts.forEach(text => {
      text.position.x -= minX;
      text.position.y -= minY;
    });

    // Translate rectangles
    result.rects.forEach(rect => {
      rect.x -= minX;
      rect.y -= minY;
    });
  }

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

  // Helper function to calculate angle between two points
  const calculateAngle = (from, to) => {
    return Math.atan2(to.y - from.y, to.x - from.x);
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

  // Helper function to get the next point in a counter clockwise direction
  const getNextPoint = (shape, knownPoint, previousPoint) => {
    const points = getShapePoints(shape);
    
    if (points.length === 2) {
      // For lines and arcs, just return the other point
      return getOtherPoint(shape, knownPoint);
    } else if (points.length === 4) {
      // For rectangles, choose direction based on cross product to maintain consistency
      const knownIndex = points.findIndex(p => pointsEqual(p, knownPoint));
      if (knownIndex === -1) return null;
      
      const nextCW = points[(knownIndex + 1) % points.length];
      const nextCCW = points[(knownIndex + 3) % points.length];
      
      if (!previousPoint) {
        // If no previous point, choose based on angle to maintain counterclockwise direction
        const angleCW = calculateAngle(knownPoint, nextCW);
        const angleCCW = calculateAngle(knownPoint, nextCCW);
        
        return nextCCW;
      }
      
      // Use cross product to determine which direction maintains consistent orientation
      const prevVector = { x: knownPoint.x - previousPoint.x, y: knownPoint.y - previousPoint.y };
      const cwVector = { x: nextCW.x - knownPoint.x, y: nextCW.y - knownPoint.y };
      const ccwVector = { x: nextCCW.x - knownPoint.x, y: nextCCW.y - knownPoint.y };
      
      // Cross product to determine turn direction
      const crossCW = prevVector.x * cwVector.y - prevVector.y * cwVector.x;
      const crossCCW = prevVector.x * ccwVector.y - prevVector.y * ccwVector.x;
      
      // Choose the direction that maintains counterclockwise orientation (positive cross product)
      return crossCCW > crossCW ? nextCCW : nextCW;
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

  // Helper function to find the largest circle
  const findLargestCircle = (circles) => {
    if (circles.length === 0) return null;
    
    return circles.reduce((largest, current) => {
      return current.radius > largest.radius ? current : largest;
    });
  };

  // Helper function to convert circle to two arcs
  const convertCircleToArcs = (circle) => {
    // Create two 180-degree arcs
    const arc1 = {
      type: 'ARC',
      center: { x: circle.center.x, y: circle.center.y },
      radius: circle.radius,
      startPoint: { 
        x: circle.center.x + circle.radius, 
        y: circle.center.y 
      },
      endPoint: { 
        x: circle.center.x - circle.radius, 
        y: circle.center.y 
      },
      direction: -1, // counterclockwise
      contourIndex: 0
    };

    const arc2 = {
      type: 'ARC',
      center: { x: circle.center.x, y: circle.center.y },
      radius: circle.radius,
      startPoint: { 
        x: circle.center.x - circle.radius, 
        y: circle.center.y 
      },
      endPoint: { 
        x: circle.center.x + circle.radius, 
        y: circle.center.y 
      },
      direction: -1, // counterclockwise
      contourIndex: 1
    };

    return [arc1, arc2];
  };

  // Get all shapes that can form contours (exclude circles and texts)
  const contourShapes = [
    ...parsedData.lines,
    ...parsedData.arcs,
    ...parsedData.rects
  ];

  if (contourShapes.length === 0) {
    // If no contour shapes, try to find the largest circle
    const largestCircle = findLargestCircle(parsedData.circles);
    if (largestCircle) {
      const result = JSON.parse(JSON.stringify(parsedData));
      const circleIndex = parsedData.circles.indexOf(largestCircle);
      if (circleIndex !== -1) {
        // Remove the circle from the circles array
        result.circles.splice(circleIndex, 1);
        // Convert to two arcs and add to arcs array
        const arcs = convertCircleToArcs(largestCircle);
        result.arcs.push(...arcs);
      }
      return result;
    }
    return false;
  }

  // Find the starting point (lowest x, then lowest y)
  const startResult = findLowestPoint(contourShapes);
  if (!startResult.point || !startResult.shape) {
    // If no valid starting point, try to find the largest circle
    const largestCircle = findLargestCircle(parsedData.circles);
    if (largestCircle) {
      const result = JSON.parse(JSON.stringify(parsedData));
      const circleIndex = parsedData.circles.indexOf(largestCircle);
      if (circleIndex !== -1) {
        // Remove the circle from the circles array
        result.circles.splice(circleIndex, 1);
        // Convert to two arcs and add to arcs array
        const arcs = convertCircleToArcs(largestCircle);
        result.arcs.push(...arcs);
      }
      return result;
    }
    return false;
  }

  const startPoint = startResult.point;
  const startShape = startResult.shape;
  
  // Track the contour
  const contourShapes_found = [startShape];
  let currentShape = startShape;
  let previousPoint = startPoint;
  let currentPoint = getNextPoint(startShape, startPoint, null);
  
  if (!currentPoint) {
    // If can't get next point, try to find the largest circle
    const largestCircle = findLargestCircle(parsedData.circles);
    if (largestCircle) {
      const result = JSON.parse(JSON.stringify(parsedData));
      const circleIndex = parsedData.circles.indexOf(largestCircle);
      if (circleIndex !== -1) {
        // Remove the circle from the circles array
        result.circles.splice(circleIndex, 1);
        // Convert to two arcs and add to arcs array
        const arcs = convertCircleToArcs(largestCircle);
        result.arcs.push(...arcs);
      }
      return result;
    }
    return false;
  }

  // Follow the contour
  while (true) {
    // Find the next shape that contains the current point
    const nextShape = findShapeContainingPoint(contourShapes, currentPoint, currentShape);
    
    if (!nextShape) {
      // No connecting shape found, not a closed contour
      // Try to find the largest circle as fallback
      const largestCircle = findLargestCircle(parsedData.circles);
      if (largestCircle) {
        const result = JSON.parse(JSON.stringify(parsedData));
        const circleIndex = parsedData.circles.indexOf(largestCircle);
        if (circleIndex !== -1) {
          // Remove the circle from the circles array
          result.circles.splice(circleIndex, 1);
          // Convert to two arcs and add to arcs array
          const arcs = convertCircleToArcs(largestCircle);
          result.arcs.push(...arcs);
        }
        return result;
      }
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
        // Try to find the largest circle as fallback
        const largestCircle = findLargestCircle(parsedData.circles);
        if (largestCircle) {
          const result = JSON.parse(JSON.stringify(parsedData));
          const circleIndex = parsedData.circles.indexOf(largestCircle);
          if (circleIndex !== -1) {
            // Remove the circle from the circles array
            result.circles.splice(circleIndex, 1);
            // Convert to two arcs and add to arcs array
            const arcs = convertCircleToArcs(largestCircle);
            result.arcs.push(...arcs);
          }
          return result;
        }
        return false;
      }
    }
    
    // Check if shape already been visited (infinite loop detection)
    if (contourShapes_found.includes(nextShape)) {
      // Infinite loop detected, try to find the largest circle as fallback
      const largestCircle = findLargestCircle(parsedData.circles);
      if (largestCircle) {
        const result = JSON.parse(JSON.stringify(parsedData));
        const circleIndex = parsedData.circles.indexOf(largestCircle);
        if (circleIndex !== -1) {
          // Remove the circle from the circles array
          result.circles.splice(circleIndex, 1);
          // Convert to two arcs and add to arcs array
          const arcs = convertCircleToArcs(largestCircle);
          result.arcs.push(...arcs);
        }
        return result;
      }
      return false;
    }
    
    // Add to contour and move to next point
    contourShapes_found.push(nextShape);
    const nextPoint = getNextPoint(nextShape, currentPoint, previousPoint);
    
    if (!nextPoint) {
      // Can't get next point, try to find the largest circle as fallback
      const largestCircle = findLargestCircle(parsedData.circles);
      if (largestCircle) {
        const result = JSON.parse(JSON.stringify(parsedData));
        const circleIndex = parsedData.circles.indexOf(largestCircle);
        if (circleIndex !== -1) {
          // Remove the circle from the circles array
          result.circles.splice(circleIndex, 1);
          // Convert to two arcs and add to arcs array
          const arcs = convertCircleToArcs(largestCircle);
          result.arcs.push(...arcs);
        }
        return result;
      }
      return false;
    }
    
    // Update for next iteration
    previousPoint = currentPoint;
    currentShape = nextShape;
    currentPoint = nextPoint;
  }

  // If contour found, tag the shapes
  if (contourShapes_found.length > 0) {
    // Create a deep copy of the parsed data
    const result = JSON.parse(JSON.stringify(parsedData));

    let contourIndex = 0; // Reset contour index for tagging
    
    // Tag contour shapes
    contourShapes_found.forEach(shape => {
      // Find the corresponding shape in the result and tag it
      const findAndTag = (shapeArray) => {
        const index = parsedData.lines.indexOf(shape);
        if (index !== -1) {
          result.lines[index].contourIndex = contourIndex++;
          return true;
        }
        
        const arcIndex = parsedData.arcs.indexOf(shape);
        if (arcIndex !== -1) {
          result.arcs[arcIndex].contourIndex = contourIndex++;
          return true;
        }
        
        const rectIndex = parsedData.rects.indexOf(shape);
        if (rectIndex !== -1) {
          result.rects[rectIndex].contourIndex = contourIndex++;
          return true;
        }
        
        return false;
      };
      
      findAndTag();
    });
    
    return result;
  }

  // Final fallback: try to find the largest circle
  const largestCircle = findLargestCircle(parsedData.circles);
  if (largestCircle) {
    const result = JSON.parse(JSON.stringify(parsedData));
    const circleIndex = parsedData.circles.indexOf(largestCircle);
    if (circleIndex !== -1) {
      // Remove the circle from the circles array
      result.circles.splice(circleIndex, 1);
      // Convert to two arcs and add to arcs array
      const arcs = convertCircleToArcs(largestCircle);
      result.arcs.push(...arcs);
    }
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

let dxfBatchImport = false;
let dxfInputs = {
    'dxfOrderInput': '',
    'dxfDrawingInput': '',
    'dxfPhaseInput': '',
    'dxfGradeInput': '',
    'dxfQuantityInput': '',
    'dxfThicknessInput': ''
};

// Function to get input value, considering batch import mode
function getInputValue(inputId) {
  let input = '';
  const modalStatus = M.Modal.getInstance(document.getElementById('dxfToNCModal')).isOpen;
  // If batch import is enabled, use the stored value
  // Otherwise, get the value from the input field
  if (modalStatus) {
    input = document.getElementById(inputId).value.trim();
    dxfInputs[inputId] = input;
  }
  if (dxfBatchImport) input = dxfInputs[inputId];
    return input;
}

// Input validation
function validateDxfInputs() {
    const requiredFields = ['dxfOrderInput', 'dxfDrawingInput', 'dxfPhaseInput', 'dxfGradeInput', 'dxfQuantityInput', 'dxfThicknessInput'];
    
    for (const fieldId of requiredFields) {
        if (getInputValue(fieldId) === '') {
            M.toast({html: 'Please fill in all required fields!', classes: 'rounded toast-warning', displayLength: 2000});
            return false;
        }
    }
    return true;
}

function dxfToNcHoleCreator(parsedDxf) {
  let result = 'BO\n';
  
  parsedDxf.circles.forEach(circle => {
    const x = circle.center.x;
    const y = circle.center.y;
    const diameter = circle.radius * 2;

    result += `v ${x.toFixed(2)} ${y.toFixed(2)} ${diameter.toFixed(2)}\n`;
  });
  
  return result;
}

function dxfToNcTextCreator(parsedDxf) {
  let result = 'SI\n';
  
  parsedDxf.texts.forEach(text => {
    const textContent = text.text;
    const x = text.position.x;
    const y = text.position.y;
    const height = text.height;
    const rotation = text.rotation;

    result += `v ${x.toFixed(2)} ${y.toFixed(2)} ${rotation.toFixed(2)} ${height.toFixed(2)} ${textContent}\n`;
  });
  
  return result;
}

function contourDataToNc(parsedData) {
  // Helper function to get all points from a shape
  const getShapePoints = (shape) => {
    switch (shape.type) {
      case 'LINE':
        return [shape.start, shape.end];
      case 'ARC':
        return [shape.startPoint, shape.endPoint];
      default:
        return [];
    }
  };

  // Helper function to check if two points are approximately equal
  const pointsEqual = (p1, p2, tolerance = 0.001) => {
    return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
  };

  // Collect all contour shapes
  const contourShapes = [];
  
  // Collect from lines
  parsedData.lines.forEach(line => {
    if (line.hasOwnProperty('contourIndex')) {
      contourShapes.push(line);
    }
  });
  
  // Collect from arcs
  parsedData.arcs.forEach(arc => {
    if (arc.hasOwnProperty('contourIndex')) {
      contourShapes.push(arc);
    }
  });
  
  // Collect from rects
  parsedData.rects.forEach(rect => {
    if (rect.hasOwnProperty('contourIndex')) {
      contourShapes.push(rect);
    }
  });

  if (contourShapes.length === 0) {
    return '';
  }

  // Build the contour by following connectivity
  const usedShapes = new Set();
  const orderedShapes = [];
  
  // Start with the first shape
  let currentShape = contourShapes[0];
  let currentPoints = getShapePoints(currentShape);
  
  if (currentPoints.length < 2) {
    return '';
  }
  
  // Choose the first point as our starting point
  let startPoint = currentPoints[0];
  let currentPoint = currentPoints[1]; // Move to the other end
  
  orderedShapes.push({
    shape: currentShape,
    startPoint: startPoint,
    endPoint: currentPoint
  });
  usedShapes.add(currentShape);
  
  // Follow the connectivity until we return to the start point
  while (usedShapes.size < contourShapes.length) {
    let nextShape = null;
    let nextStartPoint = null;
    let nextEndPoint = null;
    
    // Find the next shape that connects to currentPoint
    for (let shape of contourShapes) {
      if (usedShapes.has(shape)) continue;
      
      const points = getShapePoints(shape);
      if (points.length < 2) continue;
      
      if (pointsEqual(points[0], currentPoint)) {
        // Current point matches first point of this shape
        nextShape = shape;
        nextStartPoint = points[0];
        nextEndPoint = points[1];
        break;
      } else if (pointsEqual(points[1], currentPoint)) {
        // Current point matches second point of this shape
        nextShape = shape;
        nextStartPoint = points[1];
        nextEndPoint = points[0];
        break;
      }
    }
    
    if (!nextShape) {
      // No connecting shape found - check if we've completed the contour
      if (pointsEqual(currentPoint, startPoint)) {
        // We've returned to the start point, contour is complete
        break;
      } else {
        M.toast({html: 'No closed contours were found!', classes: 'rounded toast-error', displayLength: 2000})
        break;
      }
    }
    
    orderedShapes.push({
      shape: nextShape,
      startPoint: nextStartPoint,
      endPoint: nextEndPoint
    });
    usedShapes.add(nextShape);
    currentPoint = nextEndPoint;
  }
  
  // Generate the NC code
  let result = 'AK\n';
  
  orderedShapes.forEach((item, index) => {
    if (index === 0) {
      // First shape - add both points
      if (item.shape.type === 'ARC') {
        result += `v ${item.startPoint.x.toFixed(2)} ${item.startPoint.y.toFixed(2)} ${item.shape.direction * item.shape.radius.toFixed(2)}\n`;
        result += `v ${item.endPoint.x.toFixed(2)} ${item.endPoint.y.toFixed(2)}\n`;
      } else {
        result += `v ${item.startPoint.x.toFixed(2)} ${item.startPoint.y.toFixed(2)}\n`;
        result += `v ${item.endPoint.x.toFixed(2)} ${item.endPoint.y.toFixed(2)}\n`;
      }
    } else {
      // Subsequent shapes - only add the end point
      if (item.shape.type === 'ARC') {
        result += `v ${item.startPoint.x.toFixed(2)} ${item.startPoint.y.toFixed(2)} ${item.shape.direction * item.shape.radius.toFixed(2)}\n`;
        result += `v ${item.endPoint.x.toFixed(2)} ${item.endPoint.y.toFixed(2)}\n`;
      } else {
        result += `v ${item.endPoint.x.toFixed(2)} ${item.endPoint.y.toFixed(2)}\n`;
      }
    }
  });

  return result.trim();
}

function convertDxfToNc(dxfFileData, fileName) {
  const parsedData = parseDxf(dxfFileData);
  const contourData = findContour(parsedData);
  const partDimensions = getPartDimensions(parsedData);
  if (!contourData) {
    M.toast({html: 'No valid contour found in the DXF data!', classes: 'rounded toast-error', displayLength: 2000});
    return null;
  }

  let ncContent = [
        'ST',
        `** Created by OpenSteel on ${new Date().toLocaleDateString()}`,
        getInputValue('dxfOrderInput'),
        getInputValue('dxfDrawingInput'),
        getInputValue('dxfPhaseInput'),
        fileName.replace(/\.dxf$/, ""),
        getInputValue('dxfGradeInput'),
        getInputValue('dxfQuantityInput'),
        `PL${getInputValue('dxfThicknessInput')}`,
        'B',
        partDimensions.width.toFixed(2),
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
        '',
    ].join('\n');

    // Add contour data
    ncContent += '\n' + contourDataToNc(contourData);

    // Add hole data
    if (parsedData.circles.length > 0) {
        ncContent += '\n' + dxfToNcHoleCreator(contourData);
    }

    // Add text data
    if (parsedData.texts.length > 0) {
        ncContent += '\n' + dxfToNcTextCreator(contourData);
    }

    ncContent += '\nEN';
  return ncContent;
}