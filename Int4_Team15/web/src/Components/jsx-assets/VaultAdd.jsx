const VaultAdd = ({ className, plusRef, buttonRef, saved }) => {
  return (
    <svg
      ref={buttonRef}
      className={className}
      viewBox="0 0 60 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {saved ? (
        <path
          ref={plusRef}
          fillRule="evenodd"
          clipRule="evenodd"
          // X-coordinates shifted +48 to match the unsaved path's location
          d="M60 12H48V0H60V12ZM52.6154 4.61538H49.8462V7.38461H52.6154H55.3846H58.1538V4.61538H55.3846H52.6154Z"
          fill="var(--color-primary-2)"
        />
      ) : (
        <path
          ref={plusRef}
          fillRule="evenodd"
          clipRule="evenodd"
          d="M60 12H48V0H60V12ZM52.6154 1.84615V4.61538H49.8462V7.38462H52.6154V10.1538H55.3846V7.38462H58.1538V4.61538H55.3846V1.84615H52.6154Z"
          fill="var(--color-primary-2)"
        />
      )}

      {/* Cleaned up duplicate paths below */}
      <path
        d="M42.1674 3.69264V1.84705H40.3333V0H3.66667V1.84705H1.83406V3.69264H0V40.6162H1.83406V42.4618H3.66667V44.3074H7.33333V48H12.8341V44.3074H31.1674V48H36.6667V44.3074H40.3333V42.4618H42.1674V40.6162H44V3.69264H42.1674ZM40.3333 38.7691H38.5007V40.6162H5.50073V38.7691H3.66667V31.3853H1.83406V29.5382H3.66667V14.7691H1.83406V12.9235H3.66667V5.53824H5.50073V3.69264H38.5007V5.53824H40.3333V38.7691Z"
        fill="var(--color-primary-2)"
      />
      <path
        d="M5.50073 5.53824V12.9235H7.33333V14.7691H5.50073V29.5382H7.33333V31.3853H5.50073V38.7691H38.5007V5.53824H5.50073ZM36.6667 25.8471H34.8341V27.6926H27.5007V25.8471H25.6667V18.4618H27.5007V16.6162H34.8341V18.4618H36.6667V25.8471Z"
        fill="var(--color-primary-2)"
      />
      <path
        d="M34.8341 18.4618H27.5007V25.8471H34.8341V18.4618Z"
        fill="var(--color-primary-2)"
      />
    </svg>
  );
};

export default VaultAdd;
