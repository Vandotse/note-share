import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card"
import { Doc } from "../../../../convex/_generated/dataModel"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FileTextIcon, GanttChartIcon, ImageIcon } from "lucide-react";
import { ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Image from "next/image";
import { formatRelative } from "date-fns";
import { FileCardActions } from "./file-actions";

export function FileCard({file}: { file: Doc<"files"> & {isFavorited: boolean}}){
    const fileUrl = useQuery(api.files.getFileUrl, { fileId: file.fileId })
    const userProfile = useQuery(api.users.getUserProfile, {
        userId: file.userId,
    });
    const typeIcons = {
        image: <ImageIcon />,
        csv: <FileTextIcon />,
        pdf: <GanttChartIcon />,
    } as Record<Doc<"files">["type"], ReactNode>;


    return (
        <Card>
            <CardHeader className="relative">
                <CardTitle className="flex gap-2 text-base font-normal">
                    <div className="flex justify-center">{typeIcons[file.type]}</div>
                    {file.name}
                </CardTitle>
                <div className="absolute right-4 top-0">
                    <FileCardActions isFavorited={file.isFavorited} file={file} />
                </div>
            </CardHeader>
            <CardContent className="h-[200px] flex justify-center items-center">
                {file.type === "image" && fileUrl && (
                    <div className="w-full h-full overflow-hidden rounded-md">
                        <Image 
                            alt={file.name} 
                            width="200" 
                            height="100" 
                            src={fileUrl} 
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                {file.type === "csv" && <GanttChartIcon className="w-20 h-20" />}
                {file.type === "pdf" && <FileTextIcon className="w-20 h-20" />}
            </CardContent>
            <CardFooter className="flex justify-between">
                <div className="flex gap-2 text-xs text-gray-700 w-40 items-center">
                <Avatar className="w-6 h-6">
                    <AvatarImage src={userProfile?.image} />
                    <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                {userProfile?.name}
                </div>
                <div className="text-xs text-gray-700">
                    Uploaded on {formatRelative(new Date(file._creationTime), new Date())}
                </div>
            </CardFooter>
        </Card>
    );
}