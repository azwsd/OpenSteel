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
          result.arcs.push({
            type: 'ARC',
            center: { x: currentEntity.center.x, y: currentEntity.center.y },
            radius: currentEntity.radius,
            startAngle: currentEntity.startAngle,
            endAngle: currentEntity.endAngle,
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