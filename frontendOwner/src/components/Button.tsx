import "../styles/Button.css";

interface ButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

function Button({ onClick, disabled, children, className }: ButtonProps) {
  return (
    <button
      className={"app-button " + (className || "")}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default Button;
