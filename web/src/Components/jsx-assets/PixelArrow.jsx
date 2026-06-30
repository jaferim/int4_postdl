const PixelArrow = ({ className, fill }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 20 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1.09285e-07 7.71429L0 10.2857L20 10.2857V7.71429L1.09285e-07 7.71429ZM15 10.2857V12.8571H17.5V10.2857H15ZM12.5 12.8571V15.4286L15 15.4286V12.8571L12.5 12.8571ZM10 15.4286L10 18H12.5V15.4286H10ZM15 7.71429V5.14286H17.5V7.71429H15Z"
        fill={fill}
      />
      <path
        d="M12.5 12.8571V2.57143L15 2.57143V12.8571L12.5 12.8571ZM10 15.4286L10 0L12.5 1.12401e-07L12.5 15.4286H10Z"
        fill={fill}
      />
    </svg>
  );
};

export default PixelArrow;
