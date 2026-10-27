import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ArchImage } from "@/components/brand/ArchImage";
import { Dialog, DialogTrigger, Sheet } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { TextField } from "@/components/ui/Field";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";

describe("TextField describedby", () => {
  it("merges a caller aria-describedby with error and hint ids", () => {
    render(
      <>
        <p id="extra">Shown on the receipt.</p>
        <TextField label="Name" name="name" hint="Your first name." error="Required." aria-describedby="extra" />
      </>,
    );
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-describedby", "name-error name-hint extra");
    expect(screen.getByRole("alert")).toHaveTextContent("Required.");
  });
});

describe("Tabs", () => {
  it("switches panels with the arrow keys", async () => {
    render(
      <Tabs defaultValue="pantry">
        <TabsList aria-label="Storage">
          <TabsTrigger value="pantry">Pantry</TabsTrigger>
          <TabsTrigger value="fridge">Fridge</TabsTrigger>
        </TabsList>
        <TabsContent value="pantry">Rice</TabsContent>
        <TabsContent value="fridge">Milk</TabsContent>
      </Tabs>,
    );
    await userEvent.tab();
    expect(screen.getByRole("tab", { name: "Pantry" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Fridge" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Milk");
  });
});

describe("Menu", () => {
  it("opens from the keyboard and selects an item", async () => {
    const onSelect = vi.fn();
    render(
      <Menu>
        <MenuTrigger>Options</MenuTrigger>
        <MenuContent>
          <MenuItem onSelect={onSelect}>Rename</MenuItem>
          <MenuItem tone="danger">Delete</MenuItem>
        </MenuContent>
      </Menu>,
    );
    screen.getByRole("button", { name: "Options" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("menuitem", { name: "Rename" }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("Sheet", () => {
  it("renders as a labelled dialog with a close button", async () => {
    render(
      <Dialog>
        <DialogTrigger>Filters</DialogTrigger>
        <Sheet side="bottom" title="Filter recipes">body</Sheet>
      </Dialog>,
    );
    await userEvent.click(screen.getByText("Filters"));
    expect(screen.getByRole("dialog", { name: "Filter recipes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("defaults to h2 and accepts h3", () => {
    const { rerender } = render(<EmptyState illustration={null} title="Nothing yet" body="b" />);
    expect(screen.getByRole("heading", { level: 2, name: "Nothing yet" })).toBeInTheDocument();
    rerender(<EmptyState illustration={null} title="Nothing yet" body="b" titleAs="h3" />);
    expect(screen.getByRole("heading", { level: 3, name: "Nothing yet" })).toBeInTheDocument();
  });
});

describe("ArchImage", () => {
  const src = "https://images.unsplash.com/photo-1?auto=format&fit=crop&w=800&q=80";
  it("defaults to a 4/5 aspect when unsized", () => {
    const { container } = render(<ArchImage src={src} alt="Salad" sizes="300px" className="w-72" />);
    expect((container.firstChild as HTMLElement).className).toContain("aspect-[4/5]");
  });
  it("keeps the caller's sizing", () => {
    const { container } = render(<ArchImage src={src} alt="Salad" sizes="300px" className="h-80 w-full md:aspect-square" />);
    expect((container.firstChild as HTMLElement).className).not.toContain("aspect-[4/5]");
  });
});
