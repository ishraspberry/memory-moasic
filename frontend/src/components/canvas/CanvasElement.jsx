import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

const CanvasElement = ({ element, isSelected, onSelect, onUpdate, isEditable }) => {
  const [isDragging, setIsDragging] = useState(false);
  const elementRef = useRef(null);

  const handleDragEnd = (event, info) => {
    if (!isEditable) return;
    
    const updatedElement = {
      ...element,
      x: element.x + info.offset.x,
      y: element.y + info.offset.y
    };
    onUpdate(updatedElement);
    setIsDragging(false);
  };

  const renderElement = () => {
    alert(element.type)
    switch (element.type) {
      case 'image':
        return (
          <motion.img
            src={element.src}
            alt=""
            style={{
              width: element.width,
              height: element.height,
              cursor: isEditable ? 'move' : 'default'
            }}
            drag={isEditable}
            dragMomentum={false}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            onClick={() => onSelect(element)}
          />
        );
      
      case 'text':
        return (
          <motion.div
            style={{
              fontSize: element.fontSize,
              fontFamily: element.fontFamily,
              color: element.color,
              cursor: isEditable ? 'move' : 'default',
              userSelect: 'none'
            }}
            drag={isEditable}
            dragMomentum={false}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            onClick={() => onSelect(element)}
          >
            {element.text}
          </motion.div>
        );
      
      case 'path':
        return (
          <svg
            width="100%"
            height="100%"
            style={{ position: 'absolute', pointerEvents: 'none' }}
          >
            <path
              d={`M ${element.points.map(p => `${p.x},${p.y}`).join(' L ')}`}
              stroke={element.color}
              strokeWidth={element.width}
              fill="none"
            />
          </svg>
        );
      
      default:
        return null;
    }
  };

  return (
    <div
      ref={elementRef}
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        border: isSelected ? '2px solid #FFD700' : 'none',
        padding: isSelected ? '4px' : '0'
      }}
    >
      {renderElement()}
      {isSelected && isEditable && (
        <div className="absolute -top-4 right-0 flex space-x-1">
          <button
            onClick={() => onUpdate({ ...element, width: element.width * 1.1, height: element.height * 1.1 })}
            className="p-1 bg-white rounded shadow"
          >
            +
          </button>
          <button
            onClick={() => onUpdate({ ...element, width: element.width * 0.9, height: element.height * 0.9 })}
            className="p-1 bg-white rounded shadow"
          >
            -
          </button>
          <button
            onClick={() => onUpdate(null)} 
            className="p-1 bg-white rounded shadow text-red-500"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};
export default CanvasElement;
