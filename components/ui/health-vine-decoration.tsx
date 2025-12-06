export function HealthVineDecoration() {
    return (
        <div className="absolute pointer-events-none overflow-hidden">
            <svg
                className="w-96 h-96 text-primary/10"
                viewBox="0 0 400 400"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
            >
                {/* Main vine curve from bottom-right */}
                <path
                    d="M 350 400 Q 320 350 300 300 Q 280 250 270 200 Q 260 150 240 100 Q 230 50 200 0"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                />
                {/* Secondary vine branches */}
                <path d="M 270 200 Q 290 180 310 170" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M 260 150 Q 240 140 220 135" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                {/* Leaf shapes - branch 1 */}
                <ellipse cx="295" cy="180" rx="12" ry="18" fill="currentColor" opacity="0.6" transform="rotate(-30 295 180)" />
                <ellipse cx="285" cy="220" rx="14" ry="20" fill="currentColor" opacity="0.5" transform="rotate(25 285 220)" />
                <ellipse cx="265" cy="270" rx="13" ry="19" fill="currentColor" opacity="0.6" transform="rotate(-35 265 270)" />
                {/* Leaf shapes - branch 2 */}
                <ellipse cx="310" cy="165" rx="11" ry="17" fill="currentColor" opacity="0.5" transform="rotate(45 310 165)" />
                <ellipse cx="225" cy="135" rx="12" ry="18" fill="currentColor" opacity="0.6" transform="rotate(-40 225 135)" />
                {/* Decorative circle nodes representing growth/wellness */}
                <circle cx="300" cy="200" r="4" fill="currentColor" opacity="0.4" />
                <circle cx="270" cy="150" r="3.5" fill="currentColor" opacity="0.5" />
                <circle cx="240" cy="100" r="3" fill="currentColor" opacity="0.4" />
                {/* Small wellness leaf accents */}
                <path
                    d="M 350 350 Q 345 355 340 350"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                />
                <path
                    d="M 360 370 Q 355 375 350 370"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                />
            </svg>
        </div>
    );
}
