function BookLogo({ size = 40, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M24 10L8 4V35L24 42L40 35V4L24 10Z"
        fill="url(#bookGradient)"
      />

      <path
        d="M24 10V42M8 4L24 10L40 4"
        stroke="#B9C5FF"
        strokeWidth="2"
      />

      <path
        d="M17 15L12 13V31L21 35V17L17 15Z"
        fill="#E0E7FF"
        fillOpacity=".8"
      />

      <defs>
        <linearGradient
          id="bookGradient"
          x1="8"
          y1="4"
          x2="40"
          y2="42"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#A855F7" />
          <stop offset=".55" stopColor="#6366F1" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default BookLogo;