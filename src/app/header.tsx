import { Button } from "@/components/ui/button";
import { OrganizationSwitcher, SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

export function Header() {
    
    return (
        <div className="relative z-10 border-b py-4 bg-gray-50">
            <div className="items-center container mx-auto justify-between flex">
                <Link href="/" className="flex gap-2 items-center text-xl">
                    <Image src="/logo.png" width="50" height="50" alt="NoteShare logo" />
                    Note-Share
                </Link>

                <SignedIn>
                    <Button variant={"outline"}>
                        <Link href="/dashboard/files"> Your Files </Link>
                    </Button>
                </SignedIn>

                <div className="flex gap-2">
                    <OrganizationSwitcher />
                    <UserButton />
                    <SignedOut>
                       <SignInButton>
                            <Button>Sign In</Button>
                        </SignInButton>
                    </SignedOut>
                </div>
            </div>
        </div>
    );
}