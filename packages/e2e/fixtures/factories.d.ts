export type FixtureName = "parent-with-school" | "staff-with-school" | "staff-with-messages" | "parent-with-payments";
export declare function cleanTestData(): Promise<void>;
export declare function seedFixture(name: FixtureName): Promise<{
    school: any;
    user: any;
    child: any;
} | {
    school: any;
    user: any;
    staffMember: any;
}>;
export declare function createParentWithSchool(): Promise<{
    school: any;
    user: any;
    child: any;
}>;
export declare function createStaffWithSchool(): Promise<{
    school: any;
    user: any;
    staffMember: any;
}>;
export declare function createStaffWithMessages(): Promise<{
    parentUser: any;
    child: any;
    messages: any;
    school: any;
    user: any;
    staffMember: any;
}>;
export declare function createParentWithPayments(): Promise<{
    paymentItems: any;
    school: any;
    user: any;
    child: any;
}>;
//# sourceMappingURL=factories.d.ts.map