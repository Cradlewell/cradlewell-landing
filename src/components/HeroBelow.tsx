"use client";

import React from "react";
import { Container, Row, Col } from "react-bootstrap";

const HeroBelow = () => {
	return (
		<div className="py-5" id="whychoose">
			<Container>
				<Row className="">
					{/* Text Section */}
					<Col lg={6} className="mb-4 mt-2 mb-lg-0">
						<h2 className="fw-bold display-6 px-3">
							Designed for New <span className="text-primary">Moms</span><br />
							<span className="text-primary">Who Deserve</span> to Breathe
						</h2>
			
					</Col>

					{/* Images Section */}
					<Col lg={6}>
			<p className="text-muted mt-3 px-3">
							Professional Newborn & Postpartum Care, Delivered to Your Door<br />
							<span className="d-block">
								Subheadline: Trusted by new mothers to provide certified nursing
								support—right at home. Professional Newborn & Postpartum Care, Delivered to Your Door.
							</span>
						</p>

						<Row className="text-center mt-4">
							<Col xs={4}>
								<h2 className="display-5 fw-bold">100+</h2>
								<p className="small text-muted mb-0">Families Served (and growing)</p>
							</Col>
							<Col xs={4}>
								<h4 className="display-5 fw-bold">40+</h4>
								<p className="small text-muted mb-0">Years of Combined Healthcare Experience</p>
							</Col>
							<Col xs={4}>
								<h4 className="display-5 fw-bold">
									4.9 <span style={{ color: "#f1c40f" }}>★</span>
								</h4>
								<p className="small text-muted mb-0">Early Customer Satisfaction</p>
							</Col>
						</Row>
					</Col>
				</Row>

                <div className="container mt-5">
                    <img className="img-fluid" src="/images/img1.png" alt="" />
                </div>
                
			</Container>
		</div>
	);
};

export default HeroBelow;
