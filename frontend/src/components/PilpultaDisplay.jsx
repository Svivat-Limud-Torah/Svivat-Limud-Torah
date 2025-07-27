// frontend/src/components/PilpultaDisplay.jsx
import React, { useState, useRef } from 'react'; // Added useRef import
import Draggable from 'react-draggable'; // This line causes the error if not installed
import { ResizableBox } from 'react-resizable';
import './PilpultaDisplay.css'; // Styles for the window
import 'react-resizable/css/styles.css'; // Default resizable styles
import { HEBREW_TEXT } from '../utils/constants';

const PilpultaDisplay = ({ questions, onClose }) => {
  const nodeRef = useRef(null); // Use useRef directly
  const [dimensions, setDimensions] = useState({ width: 450, height: 350 });

  // Calculate max constraints based on window size, ensuring it runs client-side
  const getMaxConstraints = () => {
    if (typeof window !== 'undefined') {
      return [window.innerWidth * 0.8, window.innerHeight * 0.7];
    }
    return [800, 600]; // Default fallback for server-side or unknown env
  };

  const handleResize = (event, { size }) => {
    setDimensions({ width: size.width, height: size.height });
  };

  // Ensure questions is an array before mapping
  const validQuestions = Array.isArray(questions) ? questions : [];

  return (
    // Draggable needs the nodeRef prop and the ref on the direct child
    <Draggable
      handle=".pilpulta-header"
      nodeRef={nodeRef}
      bounds="parent" // Keep draggable within the viewport bounds
    >
      {/* The direct child of Draggable needs the ref */}
      <div ref={nodeRef} style={{ position: 'fixed', top: '100px', left: '100px', zIndex: 1500 }}>
        <ResizableBox
          width={dimensions.width}
          height={dimensions.height}
          minConstraints={[250, 200]} // Min width, height
          maxConstraints={getMaxConstraints()} // Max width, height based on window
          onResizeStop={handleResize} // Use onResizeStop for performance
          className="pilpulta-window" // Apply main styling here
          handleSize={[15, 15]} // Size of the resize handles
        >
          {/* ResizableBox requires a single child for layout - this structure is correct */}
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="pilpulta-header">
              <span className="pilpulta-title">{HEBREW_TEXT.pilpultaTitle || "פלפולתא"}</span>
              <button onClick={onClose} className="pilpulta-close-button" title={HEBREW_TEXT.close}>
                ✕
              </button>
            </div>
            <div className="pilpulta-content">
              {validQuestions.length === 0 ? (
                 <p>{HEBREW_TEXT.pilpultaNoResults || "לא נוצרו קושיות."}</p>
              ) : (
                validQuestions.map((item, index) => (
                  <div key={index} className="pilpulta-item">
                    <div className="pilpulta-question">
                      {`${index + 1}. ${item.question || HEBREW_TEXT.pilpultaMissingQuestion || "שאלה חסרה"}`}
                    </div>
                    <div className="pilpulta-source">
                      {item.source || HEBREW_TEXT.pilpultaMissingSource || "מקור חסר"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </ResizableBox>
      </div>
    </Draggable>
  );
};

// Ensure this is the very last line and correctly spelled
export default PilpultaDisplay;