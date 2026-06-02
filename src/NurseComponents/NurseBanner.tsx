import React from "react";
import { Col, Container, Row } from "react-bootstrap";
import { ArrowRight } from "lucide-react";

const NurseBanner = () => {
	return (
		<section className="ezy__header1 light dark">
			<Container className="position-relative">
				<Row className="align-items-center">
					<Col lg={7} className="pe-xl-5 text-center text-lg-start">
						<h1 className="ezy__header1-heading mb-4">
							<span style={{ color: "var(--cw-brand-primary)" }}>Where your care is</span><br />
							respected, protected &amp; rewarded —
							<span style={{ color: "var(--cw-brand-primary)" }}> not just assigned.</span>
						</h1>
						<p className="ezy__header1-sub-heading mb-4">
							Join India&apos;s most trusted postnatal home care service that puts nurses first.
						</p>
						<a
							target="_blank"
							rel="noopener noreferrer"
							href="https://forms.gle/hdU6nT2sV2yh5XwJ7"
							className="cw-hero-cta"
							style={{ marginTop: 8 }}
						>
							<span>Apply now to join</span>
							<span className="cw-hero-cta-arrow"><ArrowRight size={18} strokeWidth={2.25} /></span>
						</a>
					</Col>
					<Col lg={5} className="mt-5 mt-lg-0">
						<img
							src="/images/nursebannerimg.png"
							alt="Cradlewell nurse providing professional newborn care at home"
							className="rounded img-fluid mt-3"
							style={{ borderRadius: 20, boxShadow: "var(--cw-shadow-lg)", width: "100%", display: "block" }}
						/>
					</Col>
				</Row>
			</Container>
		</section>
	);
};

export default NurseBanner;
