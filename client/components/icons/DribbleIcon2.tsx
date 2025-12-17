{/*12-11-25 Thursday 11pm - Dribbling Icon #2*/}

import { cn } from "@/lib/utils";

//Dribbling icon #2:         
export function DribbleIcon2({ className }: { className?: string }) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={cn("inline-block", className)}
        aria-hidden="true"
      >
        {/*ball */}                                    
        <circle cx="17" cy="5" r="3" fill="currentColor" />
        {/*body */}
        <path
          d="M10 8L8 13l2 3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/*front leg */}
        <path
          d="M10 16l-1.5 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {/*back leg */}
        <path
          d="M10 15l2.5 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {/*arm toward ball */}
        <path
          d="M10 9.5L14 6.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {/*head */}
        <circle cx="10" cy="6.5" r="1.1" fill="currentColor" />
      </svg>
    );
  }