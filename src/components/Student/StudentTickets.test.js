import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import StudentTickets from "./StudentTickets";
import * as AuthContextModule from "../../context/AuthContext";
import * as apiModule from "../../utils/api";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../../context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../utils/api", () => ({
  apiRequest: jest.fn(),
}));

describe("Student Tickets & Support Workflow Suite", () => {
  const mockLogout = jest.fn();
  const sampleTickets = [
    {
      ticketId: "SGP-TKT-0001",
      category: "College Verification",
      subject: "Verification timeline inquiry",
      message: "Why is my application still under college verification?",
      status: "IN_PROGRESS",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      replies: [
        {
          sender: "Student",
          senderRole: "STUDENT",
          message: "Why is my application still under college verification?",
          timestamp: new Date().toISOString(),
        },
        {
          sender: "College Verification Officer",
          senderRole: "COLLEGE_STAFF",
          message: "Your documents are currently being verified by the college authority.",
          timestamp: new Date().toISOString(),
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
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
    apiModule.apiRequest.mockImplementation((url, opts) => {
      if (url === "/api/student/tickets" && (!opts || opts.method === "GET")) {
        return Promise.resolve({ tickets: sampleTickets });
      }
      if (url === "/api/student/applications") {
        return Promise.resolve({ applications: [{ applicationId: "APP-2026-0001", scheme: { schemeName: "NFST" } }] });
      }
      if (url === "/api/student/tickets" && opts?.method === "POST") {
        return Promise.resolve({
          message: "Ticket submitted successfully",
          ticket: {
            ticketId: "SGP-TKT-0002",
            subject: "New Question",
            status: "OPEN",
          },
        });
      }
      if (url.includes("/reply") && opts?.method === "POST") {
        return Promise.resolve({ message: "Reply sent successfully" });
      }
      return Promise.resolve({});
    });
  });

  test("1. Renders Support Tickets page with standardized Back button and Raise Ticket CTA", async () => {
    render(
      <BrowserRouter>
        <StudentTickets />
      </BrowserRouter>
    );

    expect(screen.getByText(/Student Helpdesk & Support Ticket System/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Back to Dashboard/i })).toHaveClass("sgp-header-btn");
    expect(screen.getByRole("button", { name: /Raise a Support Ticket/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("SGP-TKT-0001")).toBeInTheDocument();
      expect(screen.getByText("Verification timeline inquiry")).toBeInTheDocument();
    });
  });

  test("2. Opens Raise Ticket modal and validates mandatory fields", async () => {
    render(
      <BrowserRouter>
        <StudentTickets />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Raise a Support Ticket/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Raise a Support Ticket/i }));

    expect(screen.getByRole("heading", { name: /Raise a Support Ticket/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Why is my application still under college verification/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Please describe your question or issue in detail/i)).toBeInTheDocument();

    // Check cancel closes modal
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(screen.queryByRole("heading", { name: /Raise a Support Ticket/i })).not.toBeInTheDocument();
  });

  test("3. Allows student to reply to open ticket conversation thread", async () => {
    render(
      <BrowserRouter>
        <StudentTickets />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("SGP-TKT-0001")).toBeInTheDocument();
    });

    // Expand conversation
    const toggleBtn = screen.getByRole("button", { name: /View Full Conversation/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByText(/Your documents are currently being verified/i)).toBeInTheDocument();

    const replyInput = screen.getByPlaceholderText(/Type a follow-up reply or clarification/i);
    fireEvent.change(replyInput, { target: { value: "Thank you for the update!" } });

    const sendBtn = screen.getByRole("button", { name: /Send Reply/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(apiModule.apiRequest).toHaveBeenCalledWith(
        "/api/student/tickets/SGP-TKT-0001/reply",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ reply: "Thank you for the update!" }),
        })
      );
    });
  });
});
