"use client";

export function PosterEditableText({
  value,
  onChange,
  placeholder,
  className = "",
  style,
  align = "center",
  variant = "default",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  style?: React.CSSProperties;
  align?: "left" | "center" | "right";
  variant?: "default" | "title" | "footer" | "footerAccent";
}) {
  const alignClass =
    align === "left"
      ? "text-left"
      : align === "right"
        ? "text-right"
        : "text-center";

  const variantClass =
    variant === "title"
      ? "poster-editable-title"
      : variant === "footer"
        ? "poster-editable-footer"
        : variant === "footerAccent"
          ? "poster-editable-footer-accent"
          : "poster-editable-default";

  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`poster-editable ${variantClass} ${alignClass} ${className}`}
      style={style}
      spellCheck={false}
    />
  );
}
