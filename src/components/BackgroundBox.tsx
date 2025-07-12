"use client";

import React from "react";
import { Button, Container } from "react-bootstrap";

const BackgroundBox = () => {
	return (
		<div className="container background-box text-white d-flex align-items-end mb-5">
			<Container className="p-4">
				<div className="content">
					<p>Book professional postpartum care from certified <br /> nurses—when you need it, where you need it.</p>
                        <Button href="#ourplans"
                            className="btn btn-primary fs-5 ">
                            Start Free Trial
                        </Button>				
                    </div>
			</Container>
		</div>
	);
};

export default BackgroundBox;
