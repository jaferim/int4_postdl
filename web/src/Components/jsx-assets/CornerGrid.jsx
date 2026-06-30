import { useGSAP } from "@gsap/react";
import gsap from "gsap";

const CornerGrid = ({ alignment, rotate }) => {
  useGSAP(() => {
    gsap.set(".rect", {
      fillOpacity: "random(0, 0.3)",
      strokeOpacity: "random(0.6, 1)",
    });
    gsap.to(".rect", {
      fillOpacity: 0,
      duration: 3,
      stagger: {
        amount: 2,
        from: "bottom",
        ease: "power3.out",
        repeat: -1,
        yoyo: true,
      },
    });

    gsap.to(".rect", {
      strokeOpacity: 0.1,
      duration: 3,
      delay: 1,
      stagger: {
        amount: 2,
        from: "center",
        ease: "power3.out",
        repeat: -1,
        yoyo: true,
      },
    });
  }, []);

  return (
    <svg
      viewBox="0 0 335 346"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`absolute ${alignment} ${rotate} opacity-20 w-[25%] sm:w-[20%] lg:w-[15%] h-auto`}
    >
      <g
        fill="var(--color-primary-1)"
        stroke="var(--color-primary-1)"
        strokeWidth="1.5"
      >
        <rect
          className="rect"
          x="296.742"
          y="341.359"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 296.742 341.359)"
        />
        <rect
          className="rect"
          x="259.641"
          y="304.268"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 259.641 304.268)"
        />
        <rect
          className="rect"
          x="185.465"
          y="304.268"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 185.465 304.268)"
        />
        <rect
          className="rect"
          x="185.465"
          y="267.178"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 185.465 267.178)"
        />
        <rect
          className="rect"
          x="185.465"
          y="230.086"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 185.465 230.086)"
        />
        <rect
          className="rect"
          x="185.465"
          y="192.99"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 185.465 192.99)"
        />
        <rect
          className="rect"
          x="111.281"
          y="230.086"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 111.281 230.086)"
        />
        <rect
          className="rect"
          x="259.641"
          y="341.359"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 259.641 341.359)"
        />
        <rect
          className="rect"
          x="185.465"
          y="341.359"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 185.465 341.359)"
        />
        <rect
          className="rect"
          x="148.367"
          y="341.359"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 148.367 341.359)"
        />
        <rect
          className="rect"
          x="148.367"
          y="304.268"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 148.367 304.268)"
        />
        <rect
          className="rect"
          x="148.367"
          y="267.178"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 148.367 267.178)"
        />
        <rect
          className="rect"
          x="111.281"
          y="341.359"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 111.281 341.359)"
        />
        <rect
          className="rect"
          x="74.1895"
          y="341.359"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 74.1895 341.359)"
        />
        <rect
          className="rect"
          x="111.281"
          y="304.268"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 111.281 304.268)"
        />
        <rect
          className="rect"
          x="111.281"
          y="267.178"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 111.281 267.178)"
        />
        <rect
          className="rect"
          x="74.1895"
          y="304.268"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 74.1895 304.268)"
        />
        <rect
          className="rect"
          x="37.0918"
          y="304.268"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 37.0918 304.268)"
        />
        <rect
          className="rect"
          x="74.1895"
          y="267.178"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 74.1895 267.178)"
        />
        <rect
          className="rect"
          x="222.553"
          y="341.359"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 222.553 341.359)"
        />
        <rect
          className="rect"
          x="222.553"
          y="304.268"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 222.553 304.268)"
        />
        <rect
          className="rect"
          x="222.553"
          y="267.178"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 222.553 267.178)"
        />
        <rect
          className="rect"
          x="259.641"
          y="230.086"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 259.641 230.086)"
        />
        <rect
          className="rect"
          width="37.0913"
          height="37.0913"
          transform="matrix(-1 8.74228e-08 8.74228e-08 1 222.553 118.81)"
        />
        <rect
          className="rect"
          width="37.0913"
          height="37.0913"
          transform="matrix(-1 8.74228e-08 8.74228e-08 1 296.738 118.809)"
        />
        <rect
          className="rect"
          width="37.0913"
          height="37.0913"
          transform="matrix(-1 8.74228e-08 8.74228e-08 1 296.738 37.741)"
        />
        <rect
          className="rect"
          width="37.0913"
          height="37.0913"
          transform="matrix(-1 8.74228e-08 8.74228e-08 1 258.301 0)"
        />
        <rect
          className="rect"
          x="296.742"
          y="192.99"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 296.742 192.99)"
        />
        <rect
          className="rect"
          x="296.742"
          y="230.15"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 296.742 230.15)"
        />
        <rect
          className="rect"
          x="333.031"
          y="230.15"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 333.031 230.15)"
        />
        <rect
          className="rect"
          x="296.742"
          y="267.178"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 296.742 267.178)"
        />
        <rect
          className="rect"
          x="333.031"
          y="267.178"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 333.031 267.178)"
        />
        <rect
          className="rect"
          x="259.641"
          y="267.178"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 259.641 267.178)"
        />
        <rect
          className="rect"
          x="296.742"
          y="304.268"
          width="37.0913"
          height="37.0913"
          transform="rotate(180 296.742 304.268)"
        />
        <rect
          className="rect"
          x="334.482"
          y="345.474"
          width="42.0955"
          height="42.0955"
          transform="rotate(180 334.482 345.474)"
        />
      </g>
    </svg>
  );
};

export default CornerGrid;
