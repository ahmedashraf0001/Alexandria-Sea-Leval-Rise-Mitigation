# Alexandria-Sea-Leval-Rise-Mitigation
🌊 Alexandria Coastal Vulnerability Assessment System
📌 Project Overview

This project is an interactive web-based decision support system designed to assess coastal vulnerability to sea level rise (SLR) in Alexandria, Egypt.
The system visualizes climate risk indicators and simulates future flooding scenarios to support urban planners, policymakers, and environmental stakeholders.

The current version represents a functional frontend prototype (Phase 1) that focuses on business requirements, user interaction, and data-driven visualization, without a live backend or AI model at this stage.

🎯 Project Objectives

Visualize coastal flood risk under multiple climate scenarios

Simulate future sea level rise impacts by year and emission pathway

Highlight high-risk zones using interactive maps and charts

Present population and infrastructure exposure in a decision-friendly format

Establish a scalable architecture ready for backend and AI integration

🧠 System Architecture

The system follows a layered architecture:

Mock Data Layer (JSON):
Simulates backend responses and AI model outputs

Service Layer:
Handles data fetching and abstracts data sources

Global State Management:
Centralized control of scenarios, years, and risk indicators

UI Layer:
Interactive maps, charts, and dashboards

This architecture enables seamless future integration with:

REST APIs

Machine Learning models (LSTM-based SLR predictions)

Real-time data sources

🗺️ Key Features

Interactive Risk Map
Dynamic choropleth map with color-coded risk levels:

Green: Low Risk

Yellow: Medium Risk

Red: High Risk

Data-Driven Charts

Sea level rise trends

Population exposure by district

Risk distribution by category

Scenario & Year Simulation
Switch between emission scenarios and future years to observe impact changes in real time

RTL Arabic Government-Style UI
Designed to match official governmental dashboards

Mock Backend Behavior
Local JSON files are consumed through a service layer with simulated API latency

🧪 Current Project Scope (Phase 1)

Frontend-only implementation

No live backend or AI model

Focus on:

Business logic

Visualization accuracy

User experience

System scalability

🚀 Future Development (Phase 2)

Backend integration (RESTful APIs)

AI-based sea level rise prediction models (LSTM / BiLSTM)

High-resolution flood inundation modeling

Infrastructure protection and mitigation modeling

Role-based access and reporting

🛠️ Technologies Used

React (TypeScript & JavaScript)

State Management (Zustand / Redux-style architecture)

Recharts (Data Visualization)

Interactive Mapping (Google Maps / Mapbox-style logic)

Mock API Services

Modular Component-Based Design

🧩 Academic Context

This project is developed as part of a graduation project and serves as a proof-of-concept for a larger coastal risk assessment platform aligned with climate resilience and urban sustainability goals.

⚠️ Disclaimer

All data used in this version is simulated for demonstration purposes and does not represent official forecasts or authoritative risk assessments.
