// --- IMPORTS ---
import React from 'react';

// --- INTERFACES ---
export interface LoaderProps {
  /** The message to display under the spinning icon */
  message: string;
}

// --- COMPONENT ---
/**
 * Loader: A centralized spinner component for Resin Kalaakaari.
 * Handles layout jumps with a defined min-height and provides 
 * visual feedback during data fetching.
 */
const Loader: React.FC<LoaderProps> = ({ message }) => {
  // --- RENDER ---
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh', // This handles the layout jump
        width: '100%'
      }}
      aria-live="polite" // a11y: Notifies assistive tech when the loader appears/disappears
      aria-busy="true"   // a11y: Indicates the container is currently busy loading
    >
      {/* --- INTERNAL STYLES --- */}
      <style>
        {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    .custom-spinner {
                        width: 40px;
                        height: 40px;
                        border: 3px solid rgba(212, 175, 55, 0.1);
                        border-top: 3px solid #D4AF37;
                        border-radius: 50%;
                        animation: spin 0.8s linear infinite;
                    }
                    .loader-text {
                        margin-top: 20px;
                        font-size: 12px;
                        font-weight: 600;
                        color: #7a7a7a;
                        letter-spacing: 2px;
                        text-transform: uppercase;
                    }
                `}
      </style>

      {/* --- VISUAL ELEMENTS --- */}
      <div
        className="custom-spinner"
        role="status"
        aria-label="Loading"
      >
        {/* a11y: Screen reader text within the spinner */}
        <span style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          border: '0'
        }}>
          Loading...
        </span>
      </div>

      <p className="loader-text">
        {message}...
      </p>
    </div>
  );
};

export default Loader;