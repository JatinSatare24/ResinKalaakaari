const Loader = ({ message }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh', // This handles the layout jump
      width: '100%'
    }}>
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

      <div className="custom-spinner" role="status"></div>
      <p className="loader-text">{message}...</p>
    </div>
  );
};

export default Loader;