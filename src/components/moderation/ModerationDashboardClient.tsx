
"use client";

import Image from "next/image";
import type { ChangeEvent } from "react";
import React, { useState, useEffect, useCallback } from "react";
import { moderateReviewImage, type ModerateReviewImageOutput } from "@/ai/flows/moderate-review-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, FileText, Images, Image as ImageIcon, CheckCircle2, XCircle, Loader2, X } from "lucide-react";

const MAX_PRODUCT_IMAGES = 5;
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function ModerationDashboardClient() {
  const [productDetails, setProductDetails] = useState<string>("");
  const [productFiles, setProductFiles] = useState<File[]>([]);
  const [customerReviewFile, setCustomerReviewFile] = useState<File | null>(null);

  const [productImagePreviews, setProductImagePreviews] = useState<string[]>([]);
  const [customerReviewImagePreview, setCustomerReviewImagePreview] = useState<string | null>(null);

  const [moderationResult, setModerationResult] = useState<ModerateReviewImageOutput | null>(null);
  const [submittedData, setSubmittedData] = useState<{ productDetails: string; productImages: string[]; customerReviewImage: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const cleanupPreviews = useCallback((previews: string[]) => {
    previews.forEach(URL.revokeObjectURL);
  }, []);

  useEffect(() => {
    return () => {
      cleanupPreviews(productImagePreviews);
      if (customerReviewImagePreview) {
        URL.revokeObjectURL(customerReviewImagePreview);
      }
    };
  }, [productImagePreviews, customerReviewImagePreview, cleanupPreviews]);

  const handleProductDetailsChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setProductDetails(e.target.value);
  };

  const handleProductFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles = newFiles.filter(file => file.size <= MAX_FILE_SIZE_BYTES);
      const oversizedFiles = newFiles.length - validFiles.length;

      if (oversizedFiles > 0) {
        toast({
          title: "File Size Error",
          description: `${oversizedFiles} file(s) exceed the ${MAX_FILE_SIZE_MB}MB size limit and were not added.`,
          variant: "destructive",
        });
      }
      
      const totalFiles = productFiles.length + validFiles.length;
      if (totalFiles > MAX_PRODUCT_IMAGES) {
        toast({
          title: "File Limit Exceeded",
          description: `You can upload a maximum of ${MAX_PRODUCT_IMAGES} product images. Only ${MAX_PRODUCT_IMAGES - productFiles.length} more can be added.`,
          variant: "destructive",
        });
        const remainingSlots = MAX_PRODUCT_IMAGES - productFiles.length;
        validFiles.splice(remainingSlots);
      }

      setProductFiles(prev => [...prev, ...validFiles]);
      const newPreviews = validFiles.map(file => URL.createObjectURL(file));
      setProductImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeProductImage = (index: number) => {
    setProductFiles(prev => prev.filter((_, i) => i !== index));
    setProductImagePreviews(prev => {
      const newPreviews = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index]);
      return newPreviews;
    });
  };

  const handleCustomerReviewFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: "File Size Error",
          description: `Customer review image exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`,
          variant: "destructive",
        });
        setCustomerReviewFile(null);
        if (customerReviewImagePreview) URL.revokeObjectURL(customerReviewImagePreview);
        setCustomerReviewImagePreview(null);
        e.target.value = ""; // Reset file input
        return;
      }
      setCustomerReviewFile(file);
      if (customerReviewImagePreview) {
        URL.revokeObjectURL(customerReviewImagePreview);
      }
      setCustomerReviewImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!productDetails || productFiles.length === 0 || !customerReviewFile) {
      setError("Please fill in all fields and upload all required images.");
      toast({ title: "Missing Inputs", description: "Please fill in all fields and upload all required images.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setError(null);
    setModerationResult(null);

    try {
      const productImagesDataUris = await Promise.all(productFiles.map(fileToDataUri));
      const customerImageDataUri = await fileToDataUri(customerReviewFile);

      setSubmittedData({
        productDetails,
        productImages: productImagesDataUris, // Or use previews if data URIs are too heavy for re-display
        customerReviewImage: customerImageDataUri,
      });

      const result = await moderateReviewImage({
        productDetails,
        productImages: productImagesDataUris,
        customerImage: customerImageDataUri,
      });
      setModerationResult(result);
      toast({ title: "Moderation Complete", description: `Image has been ${result.approved ? 'Approved' : 'Rejected'}.` });
    } catch (err) {
      console.error("Moderation error:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during moderation.";
      setError(errorMessage);
      toast({ title: "Moderation Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const isFormValid = productDetails && productFiles.length > 0 && customerReviewFile;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <header className="text-center">
        <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">Review Shield</h1>
        <p className="text-muted-foreground mt-2 text-lg">AI-Powered Image Moderation for E-commerce</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center"><FileText className="mr-2 h-6 w-6 text-primary" />Submit for Moderation</CardTitle>
            <CardDescription>Provide product details and images to start the moderation process.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="productDetails" className="text-lg font-medium">Product Details</Label>
              <Textarea
                id="productDetails"
                value={productDetails}
                onChange={handleProductDetailsChange}
                placeholder="Enter details about the product..."
                rows={4}
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productImages" className="text-lg font-medium">Product Images (Max {MAX_PRODUCT_IMAGES}, {MAX_FILE_SIZE_MB}MB each)</Label>
              <Input
                id="productImages"
                type="file"
                multiple
                accept="image/*"
                onChange={handleProductFilesChange}
                disabled={productFiles.length >= MAX_PRODUCT_IMAGES}
                className="text-base"
              />
              {productFiles.length >= MAX_PRODUCT_IMAGES && <p className="text-sm text-destructive">Maximum number of product images reached.</p>}
              {productImagePreviews.length > 0 && (
                <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {productImagePreviews.map((src, index) => (
                    <div key={index} className="relative group">
                      <Image src={src} alt={`Product Preview ${index + 1}`} width={100} height={100} className="rounded-md object-cover aspect-square border" data-ai-hint="product photo" />
                       <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeProductImage(index)}>
                         <X className="h-4 w-4" />
                       </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerReviewImage" className="text-lg font-medium">Customer Review Image ({MAX_FILE_SIZE_MB}MB max)</Label>
              <Input
                id="customerReviewImage"
                type="file"
                accept="image/*"
                onChange={handleCustomerReviewFileChange}
                className="text-base"
              />
              {customerReviewImagePreview && (
                <div className="mt-2 relative w-40 h-40">
                  <Image src={customerReviewImagePreview} alt="Customer Review Preview" layout="fill" className="rounded-md object-cover border" data-ai-hint="review photo"/>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSubmit} disabled={isLoading || !isFormValid} className="w-full text-lg py-6">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Moderating...
                </>
              ) : (
                "Moderate Image"
              )}
            </Button>
          </CardFooter>
        </Card>

        {(isLoading || error || moderationResult || submittedData) && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Moderation Outcome</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading && (
                <div className="flex items-center justify-center p-8 text-primary">
                  <Loader2 className="mr-3 h-8 w-8 animate-spin" />
                  <span className="text-xl">Processing your request...</span>
                </div>
              )}
              {error && !isLoading && (
                <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-md">
                  <h3 className="font-bold text-lg">Error</h3>
                  <p>{error}</p>
                </div>
              )}
              {moderationResult && submittedData && !isLoading && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-headline text-xl mb-2 flex items-center"><FileText className="mr-2 h-5 w-5 text-primary"/>Product Details</h3>
                    <p className="p-3 bg-secondary/50 rounded-md whitespace-pre-wrap">{submittedData.productDetails}</p>
                  </div>
                  <div>
                    <h3 className="font-headline text-xl mb-2 flex items-center"><Images className="mr-2 h-5 w-5 text-primary"/>Submitted Product Images</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {submittedData.productImages.map((src, index) => (
                        <div key={`submitted-prod-${index}`} className="relative aspect-square">
                          <Image src={src} alt={`Submitted Product ${index + 1}`} layout="fill" className="rounded-md object-cover border" data-ai-hint="product photo" />
                        </div>
                      ))}
                    </div>
                  </div>
                   <div>
                    <h3 className="font-headline text-xl mb-2 flex items-center"><ImageIcon className="mr-2 h-5 w-5 text-primary"/>Submitted Customer Review Image</h3>
                    {submittedData.customerReviewImage && (
                       <div className="relative w-full aspect-video max-w-md">
                         <Image src={submittedData.customerReviewImage} alt="Submitted Customer Review" layout="fill" className="rounded-md object-contain border" data-ai-hint="review photo" />
                       </div>
                    )}
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-headline text-xl mb-2">Moderation Status</h3>
                    <div className={`flex items-center p-3 rounded-md text-lg font-semibold ${moderationResult.approved ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {moderationResult.approved ? <CheckCircle2 className="mr-2 h-6 w-6" /> : <XCircle className="mr-2 h-6 w-6" />}
                      Status: {moderationResult.approved ? "Approved" : "Rejected"}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-headline text-xl mb-1">Reason:</h3>
                    <p className="p-3 bg-muted/50 rounded-md whitespace-pre-wrap">{moderationResult.reason}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
