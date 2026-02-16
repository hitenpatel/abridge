export type FixtureName = "parent-with-school" | "staff-with-school" | "staff-with-messages" | "parent-with-payments" | "parent-with-posts" | "staff-with-posts";
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
export declare function createParentWithPosts(): Promise<{
    staffUser: any;
    posts: any;
    school: any;
    user: any;
    child: any;
}>;
export declare function createStaffWithPosts(): Promise<{
    child: any;
    posts: any;
    school: any;
    user: any;
    staffMember: any;
}>;
//# sourceMappingURL=factories.d.ts.map