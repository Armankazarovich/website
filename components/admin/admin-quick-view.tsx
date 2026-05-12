"use client"; import { AdminModal } from "@/components/admin/admin-modal"; interface AdminQuickViewProps { open: boolean; onClose: () => void; title?: string; subtitle?: string; children: React.ReactNode; size?: "sm" | "md" | "lg" | "xl";
} export function AdminQuickView({ open, onClose, title, subtitle, children, size = "lg" }: AdminQuickViewProps) { return ( <AdminModal open={open} onClose={onClose} title={title} subtitle={subtitle} size={size} bodyClassName="p-0" > {children} </AdminModal> );
}
