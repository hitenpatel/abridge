import React from "react";

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={`bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 disabled:opacity-50 ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
