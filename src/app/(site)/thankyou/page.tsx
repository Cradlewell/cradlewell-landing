import Link from "next/link";

export default function ThankYouPage() {
  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-light px-3">
      <div className="bg-white border shadow-lg rounded-4 p-5 text-center" style={{ maxWidth: '600px', width: '100%' }}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="64"
          height="64"
          fill="blue"
          className="bi bi-check-circle-fill mb-3"
          viewBox="0 0 16 16"
        >
          <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM6.97 11.03a.75.75 0 0 0 1.08 0l4.992-4.993a.75.75 0 0 0-1.06-1.06L7.5 9.439 5.53 7.47a.75.75 0 0 0-1.06 1.06l2.5 2.5z" />
        </svg>
        <h1 className="fw-bold text-dark">Thank You!</h1>
        <p className="text-muted fs-5 mb-4">
          Your details has been received. Our team will contact you shortly
        </p>
        <Link href="/" className="btn btn-primary px-4 py-2">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
