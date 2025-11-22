{/*11-17-25 Monday Frontend update - My Runs/Team Groups stat - placeholder number 3 for now*/}
export function DribbleIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="5" r="2.5" />
        <path d="M12 7.5 L12 12.5" />
        <path d="M12 9.5 L17 11" />
        <path d="M12 9.5 L9 11" />
        <path d="M12 12.5 L14.5 17" />
        <path d="M12 12.5 L9.5 17" />
        <circle cx="18.2" cy="14.2" r="2" />
        <path d="M18.2 16.5 L18.2 19.2" strokeWidth={1.4} />
      </svg>
    );
  }
  