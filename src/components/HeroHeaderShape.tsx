import React from "react";
import { Button, Col, Container, Row } from "react-bootstrap";

const HeroHeaderShape = () => (
	<svg
		className="position-absolute start-0 top-0 bottom-0"
		width="602"
		height="742"
		viewBox="0 0 602 742"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			d="M529.67 368.784C488.233 175.629 530.084 75.9263 602 0H0V742C7.22773 740.175 75.4574 695.495 242.852 656.948C584.139 584.605 555.256 488.05 529.67 368.784Z"
			fill="url(#paint0_linear_4_4301)"
			fillOpacity="0.6"
		/>
		<defs>
			<linearGradient
				id="paint0_linear_4_4301"
				x1="310.118"
				y1="576.967"
				x2="770.228"
				y2="95.337"
				gradientUnits="userSpaceOnUse"
			>
				<stop stopColor="#E7F6FD" />
				<stop offset="1" stopColor="#DBEEF8" />
			</linearGradient>
		</defs>
	</svg>
);

const HeroHeader1 = () => {
	return (
		<section className="ezy__header1 light dark">
			<HeroHeaderShape />
			<Container className="position-relative">
				<Row className="align-items-center">
					<Col lg={6} className="pe-xl-5 text-center text-lg-start">
						<h2 className="ezy__header1-heading mb-4">
							<span className="primary-color">Expert</span> <br />
                            Newborn & Mother Care 
						</h2>
						<p className="ezy__header1-sub-heading">
							Book professional postpartum care from certified nurses—when you need it, where you need it.
						</p>
						<a
							className="btn btn-primary fs-5 mt-4 mt-md-5"
						>
							Start Free Trial
						</a>
					</Col>
					<Col lg={6} className="mt-5 mt-lg-0">
						<img
							src="/images/bannerimg.png"
							alt=""
							className="rounded img-fluid mt-3"
						/>
					</Col>
				</Row>
			</Container>
		</section>
	);
};

export { HeroHeaderShape };
export default HeroHeader1;
