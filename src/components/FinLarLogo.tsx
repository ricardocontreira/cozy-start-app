interface FinLarLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
};

export function FinLarLogo({ size = "md", className = "" }: FinLarLogoProps) {
  return (
    <span
      className={`font-bold bg-gradient-to-r from-[#2A9D8F] to-[#E9C46A] bg-clip-text text-transparent ${sizeClasses[size]} ${className}`}
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      FinLar
    </span>
  );
}
