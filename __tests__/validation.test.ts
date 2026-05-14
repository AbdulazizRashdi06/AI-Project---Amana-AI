import { emailSchema, reportSchema } from "@/lib/validation";

describe("validation", () => {
  it("accepts any valid email address", () => {
    expect(emailSchema.parse("student@student.campus.edu")).toBe("student@student.campus.edu");
    expect(emailSchema.parse("person@example.com")).toBe("person@example.com");
  });

  it("rejects invalid email addresses", () => {
    expect(() => emailSchema.parse("not-an-email")).toThrow();
  });

  it("requires a non-empty report description", () => {
    expect(() =>
      reportSchema.parse({
        type: "lost",
        title: "ID card",
        description: "",
        category: "ID card",
        locationText: "Library",
        photoUris: [],
      }),
    ).toThrow();
  });
});
