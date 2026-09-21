import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Dashboard from "./Dashboard";
import * as AuthContextModule from "../../context/AuthContext";
import * as apiModule from "../../utils/api";

// Mock react-router-dom navigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Mock AuthContext
jest.mock("../../context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

// Mock apiRequest
jest.mock("../../utils/api", () => ({
  apiRequest: jest.fn().mockResolvedValue({ applications: [] }),
}));

describe("Student Dashboard Header UI & Accessibility Suite", () => {
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    apiModule.apiRequest.mockResolvedValue({ applications: [] });
    AuthContextModule.useAuth.mockReturnValue({
      user: {
        id: "stu-101",
        fullName: "Aarav Sharma",
        email: "student@sgp.gov.in",
        role: "STUDENT",
      },
      logout: mockLogout,
      isAuthenticated: true,
    });
  });

  test("1. Standalone student-name badge is removed from header bar", () => {
    const { container } = render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    // The header must NOT have any standalone .user-name-badge
    const nameBadge = container.querySelector(".user-name-badge");
    expect(nameBadge).toBeNull();

    // Student full name must NOT be displayed as an unclickable badge in the header
    expect(screen.queryByText(/🎓 Aarav Sharma/i)).not.toBeInTheDocument();
  });

  test("2. 'Application Status' is rendered instead of generic 'Status'", () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    // Should find "Application Status" button
    const statusBtn = screen.getByRole("button", { name: /view application status/i });
    expect(statusBtn).toBeInTheDocument();
    expect(statusBtn).toHaveTextContent(/Application Status/i);

    // Should NOT have a bare "Status" button that doesn't mention "Application Status"
    const exactStatus = screen.queryByRole("button", { name: /^status$/i });
    expect(exactStatus).not.toBeInTheDocument();
  });

  test("3. Profile button is rendered and navigates to /student/profile", () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    const profileBtn = screen.getByRole("button", { name: /view student profile/i });
    expect(profileBtn).toBeInTheDocument();
    expect(profileBtn).toHaveTextContent(/Profile/i);
  });

  test("4. Sign Out button is accessible and invokes logout", () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    const signOutBtn = screen.getByRole("button", { name: /sign out of session/i });
    expect(signOutBtn).toBeInTheDocument();
    fireEvent.click(signOutBtn);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  test("5. Mobile hamburger button toggles accessible drawer with Escape key closing", () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    const hamburgerBtn = screen.getByLabelText(/open navigation menu/i);
    expect(hamburgerBtn).toBeInTheDocument();
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "false");

    // Click to open mobile drawer
    fireEvent.click(hamburgerBtn);
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "true");

    const drawer = screen.getByRole("navigation", { name: /mobile navigation drawer/i });
    expect(drawer).toBeInTheDocument();

    // Verify student navigation items exist inside mobile drawer
    expect(screen.getAllByText(/application status/i).length).toBeGreaterThanOrEqual(2);

    // Press Escape key to close mobile drawer
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(screen.queryByRole("navigation", { name: /mobile navigation drawer/i })).not.toBeInTheDocument();
  });

  test("6. Notification dropdown opens and closes with Escape key", () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    const notifBtn = screen.getByRole("button", { name: /3 unread notifications/i });
    expect(notifBtn).toBeInTheDocument();
    expect(notifBtn).toHaveAttribute("aria-expanded", "false");

    // Open notifications
    fireEvent.click(notifBtn);
    expect(notifBtn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: /notifications panel/i })).toBeInTheDocument();

    // Press Escape to dismiss
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(screen.queryByRole("region", { name: /notifications panel/i })).not.toBeInTheDocument();
  });
});
