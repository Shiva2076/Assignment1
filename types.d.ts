//👇🏻 before Firebase upload
interface JobSeeker {
    name: string;
    email: string;
    cv: File;
}
//👇🏻 after Firebase upload
interface JobSeekerFirebase {
    name: string;
    email: string;
    cv: string;
    id: string;
}