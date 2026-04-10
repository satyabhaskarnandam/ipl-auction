import { render, screen } from "@testing-library/react";
import App from "./App";

jest.mock("./lib/socket", () => ({
  socket: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    id: "test-socket-id",
  },
}));

test("renders lobby page title", () => {
  render(<App />);
  const heading = screen.getByText(/ipl auction lobby/i);
  expect(heading).toBeInTheDocument();
});
