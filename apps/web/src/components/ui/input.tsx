import React from "react";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
