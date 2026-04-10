import React, { forwardRef } from 'react';
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import './ScrollWrapper.css';

const ScrollWrapper = forwardRef(({ children, maxHeight, className = "", style = {}, id }, ref) => {
  return (
    <SimpleBar 
      ref={ref}
      id={id}
      className={className}
      style={{ 
        maxHeight: maxHeight || "100%", 
        height: "100%", 
        ...style 
      }} 
      autoHide={true}
    >
      {children}
    </SimpleBar>
  );
});

ScrollWrapper.displayName = "ScrollWrapper";

export default ScrollWrapper;
