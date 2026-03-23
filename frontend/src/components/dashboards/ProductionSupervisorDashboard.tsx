"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Factory, Package, Clock, TrendingUp, AlertTriangle, CheckCircle, XCircle, 
  PlayCircle, PauseCircle, Users, Boxes, Beaker, ClipboardList, BarChart3, 
  Calendar, Plus, Eye, Edit, Settings, Bell, LogOut, RefreshCw, User as UserIcon,
  Mail, Building2, Shield, Activity, X, Wrench, Trash2
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { type User } from '@/lib/auth';
import { clearAuth as clearAuthLib } from '@/lib/auth';
import { ROUTES } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface ProductionOrder {
  id: number;
  orderNum: string;
  product: string;
  targetQty: number;
  producedQty: number;
  status: 'in_progress' | 'halted' | 'planned' | 'completed';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  ordersAffected?: number;
  reason?: string;
}

interface WIPItem {
  id: number;
  product: string;
  qty: number;
  stage: string;
  line: string;
  completion: number;
}

interface RawMaterial {
  sku: string;
  name: string;
  current: number;
  required: number;
  status: 'critical' | 'low' | 'sufficient';
  ordersAffected: number;
}

type Tool = {
  tool_id?: number;
  company_id: number;
  branch_id: number;
  category_id: number;
  tool_name: string;
  tool_code?: string | null;
  location_id?: number | null;
  location?: string | null; // Location name from JOIN
  created_at?: string;
  updated_at?: string;
};

type ToolCategory = {
  category_id: number;
  name: string;
  description?: string | null;
};

interface QualityControl {
  batch: string;
  product: string;
  qty: number;
  status: 'failed' | 'pending' | 'passed';
  issue: string | null;
  age: string;
}

interface Alert {
  type: 'danger' | 'warning';
  message: string;
  count: number;
}

type ActivityLog = {
  action_type: string;
  entity_type: string;
  description: string | null;
  created_at: string;
};

const ProductionSupervisorDashboard = () => {
  const router = useRouter();
  const { user, updateUser, clearAuth } = useAuthStore();
  const [activeSection, setActiveSection] = useState<'dashboard' | 'my-schedule' | 'orders' | 'wip' | 'bom' | 'quality' | 'materials' | 'material-requests' | 'worker-assignments' | 'production-schedule' | 'equipment-maintenance' | 'production-reports' | 'efficiency-analysis' | 'cost-analysis' | 'profile'>('dashboard');
  const profileFetchedRef = useRef(false);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  // Dashboard Statistics
  const [stats, setStats] = useState({
    activeOrders: 0,
    completedToday: 0,
    pendingOrders: 0,
    workersOnShift: 0,
    todayProduction: 0,
    targetProduction: 0,
    efficiencyRate: 0,
    defectRate: 0,
    rawMaterialsLow: 0,
    equipmentIssues: 0
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // Production data
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [productionOrdersLoading, setProductionOrdersLoading] = useState(false);
  const [wipData, setWipData] = useState<WIPItem[]>([]);
  const [wipLoading, setWipLoading] = useState(false);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [rawMaterialsLoading, setRawMaterialsLoading] = useState(false);
  const [pendingQC, setPendingQC] = useState<QualityControl[]>([]);
  const [qcLoading, setQcLoading] = useState(false);

  // Materials section tab state
  const [materialsTab, setMaterialsTab] = useState<'materials' | 'tools' | 'categories'>('materials');

  // Tools state
  const [tools, setTools] = useState<Tool[]>([]);
  const [toolCategories, setToolCategories] = useState<ToolCategory[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [toolsError, setToolsError] = useState<string | null>(null);
  const [showToolForm, setShowToolForm] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [toolFormData, setToolFormData] = useState({
    tool_name: "",
    tool_code: "",
    category_id: "",
    location_id: "",
  });
  const [toolSubmitting, setToolSubmitting] = useState(false);
  const [toolFormError, setToolFormError] = useState<string | null>(null);
  const [toolFormSuccess, setToolFormSuccess] = useState<string | null>(null);
  
  // Tool Categories state
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ToolCategory | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
  });
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null);
  const [categoryFormSuccess, setCategoryFormSuccess] = useState<string | null>(null);

  // Bill of Materials Data
  interface BOMItem {
    id: number; // bom_item_id
    product: string;
    sku: string; // finished product or variant sku
    material: string;
    materialSku: string;
    quantity: number;
    unit: string;
    cost?: number;
    supplier?: string;
  }

  const [bomData, setBomData] = useState<BOMItem[]>([]);
  const [bomLoading, setBomLoading] = useState(false);
  const [bomTab, setBomTab] = useState<'items' | 'boms'>('items');

  // Add BOM Item Form
  const [showAddBomItemForm, setShowAddBomItemForm] = useState(false);
  const [bomFormMaterials, setBomFormMaterials] = useState<any[]>([]);
  const [bomFormMaterialsLoading, setBomFormMaterialsLoading] = useState(false);
  const [bomList, setBomList] = useState<any[]>([]);
  const [bomListLoading, setBomListLoading] = useState(false);
  
  // Success notification state
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // WIP filters and view state
  const [wipSearchQuery, setWipSearchQuery] = useState('');
  const [wipStatusFilter, setWipStatusFilter] = useState<string>('all');
  const [viewingWip, setViewingWip] = useState<any>(null);

  // WIP filtered data - moved to top level to avoid hooks rule violation
  const filteredWipData = useMemo(() => {
    let filtered = [...wipData];

    // Apply search filter
    if (wipSearchQuery.trim()) {
      const query = wipSearchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.product?.toLowerCase().includes(query) ||
        item.batch_code?.toLowerCase().includes(query) ||
        item.line?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (wipStatusFilter !== 'all') {
      filtered = filtered.filter(item => item.stage === wipStatusFilter);
    }

    return filtered;
  }, [wipData, wipSearchQuery, wipStatusFilter]);

  // WIP stats - moved to top level to avoid hooks rule violation
  const wipStats = useMemo(() => {
    const total = wipData.length;
    const inProgress = wipData.filter(item => item.stage === 'in_progress').length;
    const planned = wipData.filter(item => item.stage === 'planned').length;
    const totalQuantity = wipData.reduce((sum, item) => sum + (item.qty || 0), 0);
    const avgCompletion = wipData.length > 0
      ? Math.round(wipData.reduce((sum, item) => sum + (item.completion || 0), 0) / wipData.length)
      : 0;

    return { total, inProgress, planned, totalQuantity, avgCompletion };
  }, [wipData]);
  const [bomItemForm, setBomItemForm] = useState({
    bom_id: '',
    component_product_id: '',
    component_quantity: '',
    unit_id: '',
    scrap_factor: ''
  });
  const [submittingBomItem, setSubmittingBomItem] = useState(false);

  // Add BOM Form
  const [showAddBomForm, setShowAddBomForm] = useState(false);
  const [finishedProducts, setFinishedProducts] = useState<any[]>([]);
  const [finishedProductsLoading, setFinishedProductsLoading] = useState(false);
  const [bomFormVariants, setBomFormVariants] = useState<any[]>([]);
  const [bomFormVariantsLoading, setBomFormVariantsLoading] = useState(false);
  const [bomForm, setBomForm] = useState({
    bom_code: '',
    product_id: '',
    variant_id: '',
    revision_code: '',
    unit_id: '',
    effective_from: '',
    effective_to: '',
    notes: ''
  });
  const [submittingBom, setSubmittingBom] = useState(false);

  // Edit BOM Item and BOM states
  const [editingBomItem, setEditingBomItem] = useState<any | null>(null);
  const editingBomItemRef = useRef<any | null>(null);
  const [editingBom, setEditingBom] = useState<any | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmText: string;
    variant: "default" | "destructive";
    onConfirm: () => void;
  } | null>(null);

  // New Production Order Form
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [units, setUnits] = useState<any[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [boms, setBoms] = useState<any[]>([]);
  const [bomsLoading, setBomsLoading] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({
    product_finished_id: '',
    batch_code: '',
    quantity_planned: '',
    unit_id: '',
    location_id: '',
    bom_id: '',
    planned_start_date: '',
    planned_end_date: '',
    status: 'planned',
    priority: 'normal',
    supervisor_id: '',
    notes: ''
  });
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Sample data for sections not yet implemented in backend
  const sampleBomData: BOMItem[] = [
    { id: 1, product: 'Strawberry Yogurt 500ml', sku: 'STR-500ML', material: 'Fresh Milk', materialSku: 'RM-MILK', quantity: 0.5, unit: 'liters', cost: 2500, supplier: 'Local Dairy' },
    { id: 2, product: 'Strawberry Yogurt 500ml', sku: 'STR-500ML', material: 'Strawberry Flavor', materialSku: 'RM-FLAVOR-STR', quantity: 0.05, unit: 'liters', cost: 1500, supplier: 'Flavor Co' },
    { id: 3, product: 'Strawberry Yogurt 500ml', sku: 'STR-500ML', material: 'Sugar', materialSku: 'RM-SUGAR', quantity: 0.1, unit: 'kg', cost: 800, supplier: 'Sugar Mills' },
    { id: 4, product: 'Strawberry Yogurt 500ml', sku: 'STR-500ML', material: 'Plastic Bottle 500ml', materialSku: 'PKG-BTL-500', quantity: 1, unit: 'unit', cost: 200, supplier: 'Packaging Ltd' }
  ];

  // Material Requests Data
  interface MaterialRequest {
    id: number;
    requestNumber: string;
    material: string;
    sku: string;
    quantity: number;
    unit: string;
    status: 'pending' | 'approved' | 'rejected' | 'fulfilled' | 'cancelled';
    requestedDate: string;
    requestedBy?: string;
    requestedByName?: string | null;
    approvedByName?: string | null;
    priority: 'urgent' | 'high' | 'normal' | 'low';
    approvedDate?: string | null;
    fulfilledDate?: string | null;
    notes?: string | null;
    rejectionReason?: string | null;
  }

  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
  const [materialRequestsLoading, setMaterialRequestsLoading] = useState(false);

  // Ensure materialRequests is always an array (defensive)
  const safeMaterialRequests = Array.isArray(materialRequests) ? materialRequests : [];

  // New Material Request Form
  const [showNewMaterialRequestForm, setShowNewMaterialRequestForm] = useState(false);
  const [materialRequestForm, setMaterialRequestForm] = useState({
    product_id: '',
    quantity_requested: '',
    unit_id: '',
    priority: 'normal',
    notes: ''
  });
  const [submittingMaterialRequest, setSubmittingMaterialRequest] = useState(false);
  const [materialRequestFormProducts, setMaterialRequestFormProducts] = useState<any[]>([]);
  const [materialRequestFormProductsLoading, setMaterialRequestFormProductsLoading] = useState(false);
  const [materialRequestFormUnits, setMaterialRequestFormUnits] = useState<any[]>([]);
  const [materialRequestFormUnitsLoading, setMaterialRequestFormUnitsLoading] = useState(false);

  // Worker Assignments Data
  interface WorkerAssignment {
    id: number;
    workerName: string;
    role: string;
    assignedTo: string;
    shift: string;
    status: 'active' | 'on_break' | 'off_duty';
    tasksCompleted: number;
    efficiency: number;
    startTime: string;
    endTime: string;
  }

  const workerAssignments: WorkerAssignment[] = [
    { id: 1, workerName: 'Jean Pierre', role: 'Line Operator', assignedTo: 'Line A', shift: 'Morning (6AM-2PM)', status: 'active', tasksCompleted: 8, efficiency: 92, startTime: '06:00', endTime: '14:00' },
    { id: 2, workerName: 'Marie Claire', role: 'Quality Controller', assignedTo: 'QC Station', shift: 'Morning (6AM-2PM)', status: 'active', tasksCompleted: 15, efficiency: 88, startTime: '06:00', endTime: '14:00' },
    { id: 3, workerName: 'Patrick Mugabo', role: 'Line Operator', assignedTo: 'Line C', shift: 'Morning (6AM-2PM)', status: 'on_break', tasksCompleted: 6, efficiency: 85, startTime: '06:00', endTime: '14:00' },
    { id: 4, workerName: 'Alice Uwimana', role: 'Packaging Specialist', assignedTo: 'Line B', shift: 'Afternoon (2PM-10PM)', status: 'off_duty', tasksCompleted: 0, efficiency: 0, startTime: '14:00', endTime: '22:00' }
  ];

  // Production Schedule Data
  interface ProductionSchedule {
    id: number;
    orderNumber: string;
    product: string;
    startTime: string;
    endTime: string;
    duration: string;
    workstation: string;
    assignedWorkers: number;
    status: 'scheduled' | 'in_progress' | 'completed' | 'delayed';
    priority: 'urgent' | 'high' | 'normal';
  }

  const productionSchedule: ProductionSchedule[] = [
    { id: 1, orderNumber: 'PRD-001', product: 'Strawberry Yogurt 500ml', startTime: '2025-12-08 08:00', endTime: '2025-12-08 16:00', duration: '8 hours', workstation: 'Line A', assignedWorkers: 4, status: 'in_progress', priority: 'high' },
    { id: 2, orderNumber: 'PRD-002', product: 'Orange Juice 1L', startTime: '2025-12-09 08:00', endTime: '2025-12-09 14:00', duration: '6 hours', workstation: 'Line B', assignedWorkers: 3, status: 'scheduled', priority: 'urgent' },
    { id: 3, orderNumber: 'PRD-003', product: 'Cocktail Mayonnaise 450g', startTime: '2025-12-08 10:00', endTime: '2025-12-08 18:00', duration: '8 hours', workstation: 'Line B', assignedWorkers: 3, status: 'in_progress', priority: 'normal' },
    { id: 4, orderNumber: 'PRD-004', product: 'Fresh Milk 1L', startTime: '2025-12-10 08:00', endTime: '2025-12-10 16:00', duration: '8 hours', workstation: 'Line C', assignedWorkers: 3, status: 'scheduled', priority: 'normal' }
  ];

  // Equipment Maintenance Data
  interface EquipmentMaintenance {
    id: number;
    equipmentName: string;
    equipmentCode: string;
    location: string;
    lastMaintenance: string;
    nextMaintenance: string;
    status: 'operational' | 'maintenance_due' | 'under_maintenance' | 'broken';
    maintenanceType: 'routine' | 'repair' | 'inspection';
    assignedTechnician: string;
  }

  const equipmentMaintenance: EquipmentMaintenance[] = [
    { id: 1, equipmentName: 'Line A Mixer', equipmentCode: 'EQ-LA-MIX-001', location: 'Line A', lastMaintenance: '2025-11-15', nextMaintenance: '2025-12-20', status: 'operational', maintenanceType: 'routine', assignedTechnician: 'Tech Team A' },
    { id: 2, equipmentName: 'Line B Mixer', equipmentCode: 'EQ-LB-MIX-001', location: 'Line B', lastMaintenance: '2025-11-20', nextMaintenance: '2025-12-10', status: 'maintenance_due', maintenanceType: 'routine', assignedTechnician: 'Tech Team B' },
    { id: 3, equipmentName: 'Pasteurization Unit', equipmentCode: 'EQ-PAST-001', location: 'Line C', lastMaintenance: '2025-12-01', nextMaintenance: '2025-12-15', status: 'operational', maintenanceType: 'inspection', assignedTechnician: 'Tech Team C' },
    { id: 4, equipmentName: 'Packaging Machine', equipmentCode: 'EQ-PKG-001', location: 'Line A', lastMaintenance: '2025-11-25', nextMaintenance: '2025-12-12', status: 'under_maintenance', maintenanceType: 'repair', assignedTechnician: 'Tech Team A' }
  ];

  // Fetch user profile data
  useEffect(() => {
    if (!user?.user_id) {
      profileFetchedRef.current = false;
      return;
    }

    if (profileFetchedRef.current) {
      return;
    }

    let isMounted = true;

    const fetchProfile = async () => {
      try {
        const response = await api.get<User>("/auth/me");
        if (!isMounted) return;
        if (response.data) {
          updateUser(response.data);
        } else if (response.error) {
          console.warn("Unable to refresh profile:", response.error);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Unexpected error fetching profile:", error);
        }
      } finally {
        if (isMounted) {
          profileFetchedRef.current = true;
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [updateUser, user?.user_id]);

  // Fetch activity logs
  useEffect(() => {
    if (!user?.company_id) {
      setActivity([]);
      return;
    }

    let isMounted = true;

    const fetchActivity = async () => {
      setActivityLoading(true);
      setActivityError(null);
      const response = await api.get<{ activity: ActivityLog[] }>("/dashboard/overview");

      if (!isMounted) {
        return;
      }

      if (response.error) {
        setActivityError(response.error);
        setActivity([]);
        setActivityLoading(false);
        return;
      }

      setActivity(response.data?.activity ?? []);
      setActivityLoading(false);
    };

    fetchActivity();

    return () => {
      isMounted = false;
    };
  }, [user?.company_id]);

  // Fetch production dashboard stats
  useEffect(() => {
    if (!user?.company_id) {
      return;
    }

    let isMounted = true;

    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const response = await api.get("/production/dashboard-overview");
        if (!isMounted) return;
        if (response.error) {
          console.error("Error fetching production stats:", response.error);
        } else {
          const data = response.data;
          if (data && typeof data === 'object' && 'activeOrders' in data) {
            setStats(data as typeof stats);
          }
        }
      } catch (error) {
        console.error("Error fetching production stats:", error);
      } finally {
        if (isMounted) setStatsLoading(false);
      }
    };

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, [user?.company_id]);

  // Fetch production orders
  useEffect(() => {
    if (!user?.company_id || activeSection !== 'orders' && activeSection !== 'dashboard') {
      return;
    }

    let isMounted = true;

    const fetchOrders = async () => {
      setProductionOrdersLoading(true);
      try {
        const response = await api.get<ProductionOrder[]>("/production/orders");
        if (!isMounted) return;
        if (response.error) {
          console.error("Error fetching production orders:", response.error);
          setProductionOrders([]); // Set empty array on error
        } else {
          setProductionOrders(response.data || []);
        }
      } catch (error) {
        console.error("Error fetching production orders:", error);
        setProductionOrders([]); // Set empty array on error
      } finally {
        if (isMounted) setProductionOrdersLoading(false);
      }
    };

    fetchOrders();

    return () => {
      isMounted = false;
    };
  }, [user?.company_id, activeSection]);

  // Fetch WIP data
  useEffect(() => {
    if (!user?.company_id || activeSection !== 'wip' && activeSection !== 'dashboard') {
      return;
    }

    let isMounted = true;

    const fetchWIP = async () => {
      setWipLoading(true);
      try {
        const response = await api.get<WIPItem[]>("/production/wip");
        if (!isMounted) return;
        if (response.error) {
          console.error("Error fetching WIP:", response.error);
          setWipData([]); // Set empty array on error
        } else {
          setWipData(response.data || []);
        }
      } catch (error) {
        console.error("Error fetching WIP:", error);
        setWipData([]); // Set empty array on error
      } finally {
        if (isMounted) setWipLoading(false);
      }
    };

    fetchWIP();

    return () => {
      isMounted = false;
    };
  }, [user?.company_id, activeSection]);

  // Handle tool form submission
  const handleToolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToolSubmitting(true);
    setToolFormError(null);
    setToolFormSuccess(null);

    try {
      if (!toolFormData.category_id) {
        setToolFormError("Category is required");
        setToolSubmitting(false);
        return;
      }

      const branchId = user?.branch_id || null;
      if (!branchId) {
        setToolFormError("Branch ID is required. Please ensure you are assigned to a branch.");
        setToolSubmitting(false);
        return;
      }

      const companyId = user?.company_id;
      if (!companyId) {
        setToolFormError("Company ID is required.");
        setToolSubmitting(false);
        return;
      }

      const payload = {
        company_id: companyId,
        branch_id: branchId,
        category_id: Number(toolFormData.category_id),
        tool_name: toolFormData.tool_name,
        tool_code: toolFormData.tool_code || null,
        location_id: toolFormData.location_id || null,
      };

      let response;
      if (editingTool?.tool_id) {
        response = await api.put(`/catalog/tools/${editingTool.tool_id}`, payload);
      } else {
        response = await api.post('/catalog/tools', payload);
      }

      if (response.error) {
        setToolFormError(response.error);
        setToolSubmitting(false);
        return;
      }

      setToolFormSuccess(editingTool ? "Tool updated successfully!" : "Tool created successfully!");
      setToolFormData({
        tool_name: "",
        tool_code: "",
        category_id: "",
        location_id: "",
      });
      setShowToolForm(false);
      setEditingTool(null);
      
      // Reload tools
      const toolsRes = await api.get<Tool[]>("/catalog/tools");
      if (!toolsRes.error && toolsRes.data) {
        setTools(toolsRes.data);
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setToolFormSuccess(null), 3000);
    } catch (err) {
      setToolFormError(err instanceof Error ? err.message : "An error occurred while saving the tool");
    } finally {
      setToolSubmitting(false);
    }
  };

  // Handle tool edit
  const handleToolEdit = (tool: Tool) => {
    setEditingTool(tool);
    setToolFormData({
      tool_name: tool.tool_name || "",
      tool_code: tool.tool_code || "",
      category_id: tool.category_id ? String(tool.category_id) : "",
      location_id: tool.location_id ? String(tool.location_id) : "",
    });
    setShowToolForm(true);
    setToolFormError(null);
    setToolFormSuccess(null);
  };

  // Handle tool delete
  const handleToolDelete = async (toolId: number) => {
    if (!confirm(`Are you sure you want to delete this tool? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await api.delete(`/catalog/tools/${toolId}`);
      if (response.error) {
        setToolsError(response.error);
        return;
      }

      // Reload tools
      const toolsRes = await api.get<Tool[]>(`/catalog/tools${user?.company_id ? `?companyId=${user.company_id}` : ''}`);
      if (!toolsRes.error && toolsRes.data) {
        setTools(toolsRes.data);
      }
    } catch (err) {
      setToolsError(err instanceof Error ? err.message : 'Failed to delete tool');
    }
  };

  // Handle category form submission
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategorySubmitting(true);
    setCategoryFormError(null);
    setCategoryFormSuccess(null);

    try {
      if (!categoryFormData.name.trim()) {
        setCategoryFormError("Category name is required");
        setCategorySubmitting(false);
        return;
      }

      const companyId = user?.company_id;
      if (!companyId) {
        setCategoryFormError("Company ID is required.");
        setCategorySubmitting(false);
        return;
      }

      const payload = {
        company_id: companyId,
        name: categoryFormData.name.trim(),
        description: categoryFormData.description.trim() || null,
      };

      let response;
      if (editingCategory?.category_id) {
        response = await api.put(`/catalog/tool-categories/${editingCategory.category_id}`, payload);
      } else {
        response = await api.post('/catalog/tool-categories', payload);
      }

      if (response.error) {
        setCategoryFormError(response.error);
        setCategorySubmitting(false);
        return;
      }

      setCategoryFormSuccess(editingCategory ? "Category updated successfully!" : "Category created successfully!");
      setCategoryFormData({
        name: "",
        description: "",
      });
      setShowCategoryForm(false);
      setEditingCategory(null);
      
      // Reload categories
      const categoriesRes = await api.get<ToolCategory[]>(`/catalog/tool-categories${companyId ? `?companyId=${companyId}` : ''}`);
      if (!categoriesRes.error && categoriesRes.data) {
        setToolCategories(categoriesRes.data);
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setCategoryFormSuccess(null), 3000);
    } catch (err) {
      setCategoryFormError(err instanceof Error ? err.message : "An error occurred while saving the category");
    } finally {
      setCategorySubmitting(false);
    }
  };

  // Handle category delete
  const handleCategoryDelete = async (categoryId: number) => {
    if (!confirm(`Are you sure you want to delete this category? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await api.delete(`/catalog/tool-categories/${categoryId}`);
      if (response.error) {
        setCategoryFormError(response.error);
        return;
      }

      // Reload categories
      const companyId = user?.company_id;
      if (companyId) {
        const categoriesRes = await api.get<ToolCategory[]>(`/catalog/tool-categories?companyId=${companyId}`);
        if (!categoriesRes.error && categoriesRes.data) {
          setToolCategories(categoriesRes.data);
        }
      }
    } catch (err) {
      setCategoryFormError(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  // Fetch raw materials
  useEffect(() => {
    if (!user?.company_id || (activeSection !== 'materials' && activeSection !== 'dashboard')) {
      return;
    }

    // Only fetch raw materials if on materials tab
    if (materialsTab !== 'materials') {
      return;
    }

    let isMounted = true;

    const fetchMaterials = async () => {
      setRawMaterialsLoading(true);
      try {
        const response = await api.get<RawMaterial[]>("/production/raw-materials");
        if (!isMounted) return;
        if (response.error) {
          console.error("Error fetching raw materials:", response.error);
          setRawMaterials([]); // Set empty array on error
        } else {
          setRawMaterials(response.data || []);
        }
      } catch (error) {
        console.error("Error fetching raw materials:", error);
        setRawMaterials([]); // Set empty array on error
      } finally {
        if (isMounted) setRawMaterialsLoading(false);
      }
    };

    fetchMaterials();

    return () => {
      isMounted = false;
    };
  }, [user?.company_id, activeSection, materialsTab]);

  // Load tools and tool categories
  useEffect(() => {
    if (!user?.company_id || activeSection !== 'materials') {
      return;
    }

    // Load tools if on tools tab
    if (materialsTab === 'tools') {
      let isMounted = true;

      const loadTools = async () => {
        setToolsLoading(true);
        setToolsError(null);
        try {
          const [toolsRes, categoriesRes, locationsRes] = await Promise.all([
            api.get<Tool[]>(`/catalog/tools${user?.company_id ? `?companyId=${user.company_id}` : ''}`),
            api.get<ToolCategory[]>(`/catalog/tool-categories${user?.company_id ? `?companyId=${user.company_id}` : ''}`),
            api.get<any[]>(`/inventory/locations${user?.company_id ? `?companyId=${user.company_id}` : ''}`),
          ]);
          
          if (!isMounted) return;

          if (toolsRes.error) {
            console.error("Error loading tools:", toolsRes.error);
            setToolsError(toolsRes.error);
            setTools([]);
          } else {
            // Handle both array response and object with data property
            const toolsData = Array.isArray(toolsRes.data) 
              ? toolsRes.data 
              : (toolsRes.data?.data || toolsRes.data || []);
            console.log("Tools loaded from database:", toolsData.length, "tools", toolsData);
            setTools(toolsData);
          }

          if (categoriesRes.data) {
            setToolCategories(categoriesRes.data);
          } else {
            setToolCategories([]);
          }

          if (locationsRes.data) {
            setLocations(locationsRes.data);
          } else {
            setLocations([]);
          }
        } catch (err) {
          if (!isMounted) return;
          setTools([]);
          setToolCategories([]);
          setLocations([]);
        } finally {
          if (isMounted) setToolsLoading(false);
        }
      };

      loadTools();

      return () => {
        isMounted = false;
      };
    }

    // Load categories if on categories tab
    if (materialsTab === 'categories') {
      let isMounted = true;

      const loadCategories = async () => {
        setCategoriesLoading(true);
        try {
          const categoriesRes = await api.get<ToolCategory[]>(`/catalog/tool-categories${user?.company_id ? `?companyId=${user.company_id}` : ''}`);
          
          if (!isMounted) return;

          if (categoriesRes.data) {
            setToolCategories(categoriesRes.data);
          } else {
            setToolCategories([]);
          }
        } catch (err) {
          if (!isMounted) return;
          setToolCategories([]);
        } finally {
          if (isMounted) setCategoriesLoading(false);
        }
      };

      loadCategories();

      return () => {
        isMounted = false;
      };
    }
  }, [user?.company_id, activeSection, materialsTab]);

  // Fetch material requests
  useEffect(() => {
    if (!user?.company_id || (activeSection !== 'material-requests' && activeSection !== 'dashboard')) {
      return;
    }

    let isMounted = true;

    const fetchMaterialRequests = async () => {
      setMaterialRequestsLoading(true);
      try {
        const response = await api.get<MaterialRequest[]>("/production/material-requests");
        if (!isMounted) return;
        if (response.error) {
          console.error("Error fetching material requests:", response.error);
          setMaterialRequests([]);
        } else {
          // Ensure we always set an array
          const data = response.data;
          setMaterialRequests(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Error fetching material requests:", error);
        setMaterialRequests([]);
      } finally {
        if (isMounted) setMaterialRequestsLoading(false);
      }
    };

    fetchMaterialRequests();

    return () => {
      isMounted = false;
    };
  }, [user?.company_id, activeSection]);

  // Load products and units for material request form
  useEffect(() => {
    if (!showNewMaterialRequestForm || !user?.company_id) {
      return;
    }

    let isMounted = true;

    const loadMaterialRequestFormData = async () => {
      setMaterialRequestFormProductsLoading(true);
      setMaterialRequestFormUnitsLoading(true);
      try {
        const [productsRes, unitsRes] = await Promise.all([
          api.get<any[]>(`/catalog/products${user?.company_id ? `?companyId=${user.company_id}` : ''}`),
          api.get<any[]>(`/units${user?.company_id ? `?companyId=${user.company_id}` : ''}`)
        ]);

        if (!isMounted) return;

        if (productsRes.data) {
          // Filter to only raw materials
          const rawMaterials = productsRes.data.filter((product: any) => {
            const productType = (product.product_type || '').toLowerCase();
            const materialClass = (product.material_classification || '').toLowerCase();
            const isActive = product.is_active !== false && product.is_active !== 0;
            return (productType === 'raw_material' || materialClass === 'raw_material') && isActive;
          });
          setMaterialRequestFormProducts(rawMaterials);
        }

        if (unitsRes.data) {
          setMaterialRequestFormUnits(unitsRes.data);
        }
      } catch (error) {
        console.error("Error loading material request form data:", error);
      } finally {
        if (isMounted) {
          setMaterialRequestFormProductsLoading(false);
          setMaterialRequestFormUnitsLoading(false);
        }
      }
    };

    loadMaterialRequestFormData();

    return () => {
      isMounted = false;
    };
  }, [showNewMaterialRequestForm, user?.company_id]);

  // Fetch quality control
  useEffect(() => {
    if (!user?.company_id || activeSection !== 'quality' && activeSection !== 'dashboard') {
      return;
    }

    let isMounted = true;

    const fetchQC = async () => {
      setQcLoading(true);
      try {
        const response = await api.get<QualityControl[]>("/production/quality-control");
        if (!isMounted) return;
        if (response.error) {
          console.error("Error fetching quality control:", response.error);
          setPendingQC([]); // Set empty array on error
        } else {
          setPendingQC(response.data || []);
        }
      } catch (error) {
        console.error("Error fetching quality control:", error);
        setPendingQC([]); // Set empty array on error
      } finally {
        if (isMounted) setQcLoading(false);
      }
    };

    fetchQC();

    return () => {
      isMounted = false;
    };
  }, [user?.company_id, activeSection]);

  // Fetch BOM definitions list for the BOM table view (only when NOT in a form)
  useEffect(() => {
    // Don't fetch if forms are open - let the form's useEffect handle it
    if (!user?.company_id || showAddBomItemForm || showAddBomForm) {
      return;
    }
    
    // Only fetch when on BOM section
    if (activeSection !== 'bom' && activeSection !== 'dashboard') {
      return;
    }

    let isMounted = true;

    const fetchBOMDefinitions = async () => {
      setBomListLoading(true);
      try {
        const response = await api.get<any[]>(`/production/bom-definitions${user?.company_id ? `?companyId=${user.company_id}` : ''}`);
        if (!isMounted) return;
        if (response.error) {
          console.error("Error fetching BOM definitions:", response.error);
          setBomList([]);
        } else {
          // Handle nested data structure: response.data might be { data: [...] } or just [...]
          let data = response.data;
          console.log("BOM definitions response:", response);
          console.log("BOM definitions response.data:", response.data);
          console.log("BOM definitions response.data type:", typeof response.data);
          console.log("BOM definitions response.data isArray:", Array.isArray(response.data));
          
          // If data is an object with a data property, extract it
          if (data && typeof data === 'object' && !Array.isArray(data) && data.data) {
            data = data.data;
            console.log("Extracted nested BOM definitions data:", data);
          }
          
          console.log("Final BOM definitions data:", data);
          console.log("Final BOM definitions data length:", Array.isArray(data) ? data.length : 0);
          setBomList(Array.isArray(data) ? data : []);
        }
      } catch (error: any) {
        console.error("Error fetching BOM definitions:", error);
        console.error("Error details:", error.message, error.stack);
        setBomList([]);
      } finally {
        if (isMounted) setBomListLoading(false);
      }
    };

    fetchBOMDefinitions();

    return () => {
      isMounted = false;
    };
  }, [user?.company_id, activeSection, showAddBomItemForm, showAddBomForm]);

  // Load data for new order form
  useEffect(() => {
    if (!showNewOrderForm || !user?.company_id) {
      return;
    }

    let isMounted = true;

    const loadFormData = async () => {
      setProductsLoading(true);
      setLocationsLoading(true);
      setUnitsLoading(true);
      setBomsLoading(true);
      
      try {
        const [productsRes, locationsRes, unitsRes, bomsRes] = await Promise.all([
          api.get<any[]>("/catalog/products"),
          api.get<any[]>("/inventory/locations"),
          api.get<any[]>(`/units${user?.company_id ? `?companyId=${user.company_id}` : ''}`),
          api.get<any[]>("/production/bom")
        ]);

        if (!isMounted) return;

        if (productsRes.data) {
          setProducts(productsRes.data || []);
        }
        if (locationsRes.data) {
          setLocations(locationsRes.data || []);
        }
        if (unitsRes.data) {
          setUnits(Array.isArray(unitsRes.data) ? unitsRes.data : []);
        }
        if (bomsRes.data) {
          setBoms(bomsRes.data || []);
        }

        // Auto-generate batch code
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const autoBatchCode = `BATCH-${year}${month}${day}-${random}`;
        
        setNewOrderForm(prev => ({
          ...prev,
          batch_code: prev.batch_code || autoBatchCode
        }));
      } catch (error) {
        console.error("Error fetching form data:", error);
      } finally {
        if (isMounted) {
          setProductsLoading(false);
          setLocationsLoading(false);
          setUnitsLoading(false);
          setBomsLoading(false);
        }
      }
    };

    loadFormData();

    return () => {
      isMounted = false;
    };
  }, [showNewOrderForm, user?.company_id]);

  // Fetch BOM data
  useEffect(() => {
    if (!user?.company_id || activeSection !== 'bom') {
      return;
    }

    let isMounted = true;

    const fetchBOM = async () => {
      setBomLoading(true);
      try {
        const response = await api.get<any[]>(`/production/bom-items${user?.company_id ? `?companyId=${user.company_id}` : ''}`);
        if (!isMounted) return;
        if (response.error) {
          console.error("Error fetching BOM:", response.error);
          setBomData([]);
        } else {
          // Handle nested data structure: response.data might be { data: [...] } or just [...]
          let data = response.data;
          console.log("BOM response:", response);
          console.log("BOM response.data:", response.data);
          console.log("BOM response.data type:", typeof response.data);
          console.log("BOM response.data isArray:", Array.isArray(response.data));
          
          // If data is an object with a data property, extract it
          if (data && typeof data === 'object' && !Array.isArray(data) && data.data) {
            data = data.data;
            console.log("Extracted nested data:", data);
          }
          
          console.log("Final BOM data:", data);
          console.log("Final BOM data length:", Array.isArray(data) ? data.length : 0);
          if (Array.isArray(data)) {
            const mapped: BOMItem[] = data.map((row: any, idx: number) => ({
              id: Number(row.bom_item_id ?? idx + 1),
              product: row.product || row.product_name || 'N/A',
              sku: row.product_sku || row.sku || '',
              material: row.material || row.material_name || '',
              materialSku: row.material_sku || '',
              quantity: Number(row.component_quantity ?? 0),
              unit: row.unit_name || row.unit_short_code || '',
            }));
            setBomData(mapped);
          } else {
            setBomData([]);
          }
        }
      } catch (error) {
        console.error("Error fetching BOM:", error);
        setBomData([]);
      } finally {
        if (isMounted) setBomLoading(false);
      }
    };

    fetchBOM();

    return () => {
      isMounted = false;
    };
  }, [user?.company_id, activeSection]);

  // This useEffect is removed - using the one below that properly loads BOM definitions

  // Handle BOM item form submission
  const handleSubmitBomItem = async () => {
    if (!bomItemForm.bom_id || !bomItemForm.component_product_id || !bomItemForm.component_quantity || !bomItemForm.unit_id) {
      setErrorMessage("Please fill in all required fields including unit");
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    const quantity = parseFloat(bomItemForm.component_quantity);
    if (isNaN(quantity) || quantity <= 0) {
      setErrorMessage("Quantity must be greater than 0");
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    setSubmittingBomItem(true);
    try {
      const payload: any = {
        component_quantity: quantity,
        unit_id: parseInt(bomItemForm.unit_id)
      };

      if (bomItemForm.scrap_factor) {
        const scrapFactor = parseFloat(bomItemForm.scrap_factor);
        if (!isNaN(scrapFactor) && scrapFactor >= 0) {
          payload.scrap_factor = scrapFactor;
        }
      }

      let response;
      if (editingBomItem) {
        // Update existing BOM item
        response = await api.put(`/production/bom-items/${editingBomItem.id || editingBomItem.bom_item_id}`, payload);
        setSuccessMessage("BOM item updated successfully!");
      } else {
        // Create new BOM item
        payload.bom_id = parseInt(bomItemForm.bom_id);
        payload.component_product_id = parseInt(bomItemForm.component_product_id);
        response = await api.post("/production/bom-items", payload);
        setSuccessMessage("BOM item added successfully!");
      }

      if (response.error) {
        setErrorMessage(response.error);
        setTimeout(() => setErrorMessage(null), 5000);
      } else {
        // Close form and reset
        setShowAddBomItemForm(false);
        setEditingBomItem(null);
        editingBomItemRef.current = null;
        setBomItemForm({
          bom_id: '',
          component_product_id: '',
          component_quantity: '',
          unit_id: '',
          scrap_factor: ''
        });
        
        // Refresh BOM data
        const bomRes = await api.get<BOMItem[]>("/production/bom");
        if (bomRes.data) {
          setBomData(bomRes.data);
        }
        
        // Auto-dismiss notification after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (error: any) {
      console.error("Error submitting BOM item:", error);
      setErrorMessage(error.message || `Failed to ${editingBomItem ? 'update' : 'add'} BOM item`);
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setSubmittingBomItem(false);
    }
  };

  // Load BOM list and raw materials when BOM item form opens
  useEffect(() => {
    if (!showAddBomItemForm || !user?.company_id) return;

    const loadBomItemFormData = async () => {
      setBomListLoading(true);
      setBomFormMaterialsLoading(true);
      setUnitsLoading(true);
      try {
        // Always fetch BOM definitions, all products, and units in parallel to ensure fresh data
        const [bomsRes, productsRes, unitsRes] = await Promise.all([
          api.get<any[]>("/production/bom-definitions"),
          api.get<any[]>("/catalog/products"),
          api.get<any[]>(`/units${user?.company_id ? `?companyId=${user.company_id}` : ''}`)
        ]);
        
        // Handle BOM list - ensure we get the data correctly
        if (bomsRes.error) {
          console.error("BOM Item Form: Error fetching BOMs:", bomsRes.error);
          setBomList([]);
        } else {
          // Handle response - check data property first, then direct array
          let bomArray: any[] = [];
          
          if (bomsRes.data) {
            if (Array.isArray(bomsRes.data)) {
              bomArray = bomsRes.data;
            } else if (bomsRes.data.data && Array.isArray(bomsRes.data.data)) {
              bomArray = bomsRes.data.data;
            }
          } else if (Array.isArray(bomsRes)) {
            bomArray = bomsRes;
          }
          
          if (bomArray.length > 0) {
            console.log(`BOM Item Form: Successfully loaded ${bomArray.length} BOMs`);
            setBomList(bomArray);
          } else {
            console.warn("BOM Item Form: No BOMs found. Response structure:", {
              hasData: !!bomsRes.data,
              dataType: typeof bomsRes.data,
              isArray: Array.isArray(bomsRes.data),
              fullResponse: bomsRes
            });
            setBomList([]);
          }
        }
        
        // Load and filter raw materials from all products
        let rawMaterials: any[] = [];
        if (productsRes.data && Array.isArray(productsRes.data)) {
          // Filter to only raw materials - check both product_type and material_classification
          rawMaterials = productsRes.data.filter((product: any) => {
            const productType = String(product.product_type || '').trim().toLowerCase();
            const materialClass = String(product.material_classification || '').trim().toLowerCase();
            
            // A product is a raw material if:
            // 1. product_type is 'raw_material' OR
            // 2. material_classification is 'raw_material'
            const isRawMaterial = productType === 'raw_material' || materialClass === 'raw_material';
            
            // Also ensure it's active
            const isActive = product.is_active !== undefined ? product.is_active !== 0 : true;
            
            return isRawMaterial && isActive;
          });
          
          setBomFormMaterials(rawMaterials);
          console.log(`BOM Item Form: Loaded ${rawMaterials.length} raw materials from ${productsRes.data.length} total products`);
          
          if (rawMaterials.length === 0 && productsRes.data.length > 0) {
            console.warn("No raw materials found. Sample products:", 
              productsRes.data.slice(0, 10).map((p: any) => ({ 
                name: p.name, 
                product_type: p.product_type, 
                material_classification: p.material_classification,
                is_active: p.is_active
              }))
            );
          }
        } else {
          setBomFormMaterials([]);
        }
        
        // Load units
        let unitsArray: any[] = [];
        if (unitsRes.data && Array.isArray(unitsRes.data)) {
          unitsArray = unitsRes.data;
          setUnits(unitsArray);
        } else {
          setUnits([]);
        }

        // If editing, set the form state after data is loaded
        // Use ref to get current value without adding to dependency array
        const currentEditingItem = editingBomItemRef.current;
        if (currentEditingItem) {
          console.log("Setting form state for editing:", currentEditingItem);
          console.log("Available raw materials:", rawMaterials.length);
          console.log("Available units:", unitsArray.length);
          console.log("Component product ID:", currentEditingItem.component_product_id);
          console.log("Unit ID:", currentEditingItem.unit_id);
          setBomItemForm({
            bom_id: String(currentEditingItem.bom_id || ''),
            component_product_id: String(currentEditingItem.component_product_id || ''),
            component_quantity: String(currentEditingItem.component_quantity || currentEditingItem.quantity || ''),
            unit_id: String(currentEditingItem.unit_id || ''),
            scrap_factor: currentEditingItem.scrap_factor !== null && currentEditingItem.scrap_factor !== undefined ? String(currentEditingItem.scrap_factor) : ''
          });
        }
      } catch (error) {
        console.error("Error loading BOM item form data:", error);
        setBomList([]);
        setBomFormMaterials([]);
        setUnits([]);
      } finally {
        setBomListLoading(false);
        setBomFormMaterialsLoading(false);
        setUnitsLoading(false);
      }
    };

    loadBomItemFormData();
  }, [showAddBomItemForm, user?.company_id, editingBomItem]);

  // Load finished products and units when BOM form opens
  useEffect(() => {
    if (!showAddBomForm || !user?.company_id) return;

    const loadBomFormData = async () => {
      setFinishedProductsLoading(true);
      setUnitsLoading(true);
      try {
        // Fetch products and units in parallel
        const [productsRes, unitsRes] = await Promise.all([
          api.get<any[]>("/catalog/products"),
          api.get<any[]>(`/units${user?.company_id ? `?companyId=${user.company_id}` : ''}`)
        ]);
        
        // Load units
        if (unitsRes.data && Array.isArray(unitsRes.data)) {
          setUnits(unitsRes.data);
        } else {
          setUnits([]);
        }
        
        // Load and filter finished products
        if (productsRes.data && Array.isArray(productsRes.data)) {
          // Filter to only show finished products
          // A product is "finished" if:
          // 1. product_type is 'finished_good' OR
          // 2. material_classification is 'finished_product' OR
          // 3. product_type is NOT 'raw_material' (exclude raw materials)
          const finished = productsRes.data.filter((product: any) => {
            const productType = String(product.product_type || '').trim();
            const materialClass = String(product.material_classification || '').trim();
            
            // Explicitly finished
            if (productType === 'finished_good' || materialClass === 'finished_product') {
              return true;
            }
            
            // Exclude raw materials
            if (productType === 'raw_material' || materialClass === 'raw_material') {
              return false;
            }
            
            // Include other types that are not raw materials (consumable, service, semi_finished, packaged, bulk)
            // These can be considered "finished" for BOM purposes
            return productType !== 'raw_material' && materialClass !== 'raw_material';
          });
          
          setFinishedProducts(finished);
          console.log(`BOM Form: Loaded ${finished.length} finished products from ${productsRes.data.length} total products`);
          console.log(`BOM Form: Loaded ${unitsRes.data?.length || 0} units`);
          
          if (finished.length === 0 && productsRes.data.length > 0) {
            console.warn("No finished products found. Sample products:", 
              productsRes.data.slice(0, 10).map((p: any) => ({ 
                name: p.name, 
                product_type: p.product_type, 
                material_classification: p.material_classification 
              }))
            );
          }
        } else {
          setFinishedProducts([]);
        }
      } catch (error) {
        console.error("Error loading BOM form data:", error);
        setFinishedProducts([]);
        setUnits([]);
      } finally {
        setFinishedProductsLoading(false);
        setUnitsLoading(false);
      }
    };

    loadBomFormData();
  }, [showAddBomForm, user?.company_id]);

  // Load variants for selected finished product (for BOM)
  useEffect(() => {
    let isMounted = true;
    const loadVariants = async () => {
      if (!showAddBomForm || !bomForm.product_id) {
        if (isMounted) {
          setBomFormVariants([]);
          setBomFormVariantsLoading(false);
        }
        return;
      }
      setBomFormVariantsLoading(true);
      try {
        const productId = parseInt(bomForm.product_id);
        const res = await api.get<any>(`/catalog/products/${productId}`);
        const variants = Array.isArray(res.data?.variants) ? res.data.variants : [];
        if (!isMounted) return;
        setBomFormVariants(variants);

        // If current variant_id is not in list, reset
        const currentVariantId = bomForm.variant_id ? parseInt(bomForm.variant_id) : null;
        const hasCurrent = currentVariantId != null && variants.some((v: any) => Number(v.variant_id) === currentVariantId);
        const nextVariantId = hasCurrent ? currentVariantId : (variants[0]?.variant_id ?? null);

        // Auto-select first variant if none selected
        if (!hasCurrent && nextVariantId != null) {
          const v = variants.find((x: any) => Number(x.variant_id) === Number(nextVariantId)) || variants[0];
          setBomForm((prev) => ({
            ...prev,
            variant_id: String(nextVariantId),
            // Auto-fill unit from variant if available and unit is empty
            unit_id: prev.unit_id || (v?.unit_id != null ? String(v.unit_id) : prev.unit_id),
          }));
        }
      } catch (err) {
        console.error("Error loading BOM variants:", err);
        if (!isMounted) return;
        setBomFormVariants([]);
      } finally {
        if (isMounted) setBomFormVariantsLoading(false);
      }
    };
    void loadVariants();
    return () => {
      isMounted = false;
    };
  }, [showAddBomForm, bomForm.product_id]);

  // Auto-generate BOM Code when product and revision are selected
  useEffect(() => {
    if (!showAddBomForm || !bomForm.product_id || !bomForm.revision_code) {
      return;
    }

    const selectedProduct = finishedProducts.find((p: any) => p.product_id === parseInt(bomForm.product_id));
    if (selectedProduct && bomForm.revision_code) {
      // Generate BOM code: First 3-4 chars of product name (uppercase, no spaces) + revision code
      const productPrefix = selectedProduct.name
        .substring(0, 4)
        .replace(/\s+/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();
      const revision = bomForm.revision_code.toUpperCase().replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
      const generatedCode = `${productPrefix}-${revision}`;
      
      // Only update if the field is empty or matches a previous auto-generated pattern
      if (!bomForm.bom_code || bomForm.bom_code.startsWith(productPrefix + '-')) {
        setBomForm((prev) => ({ ...prev, bom_code: generatedCode }));
      }
    }
  }, [bomForm.product_id, bomForm.revision_code, finishedProducts, showAddBomForm]);

  // Handle BOM form submission
  const handleSubmitBom = async () => {
    if (!bomForm.bom_code || !bomForm.product_id || !bomForm.variant_id || !bomForm.revision_code || !bomForm.unit_id || !bomForm.effective_from) {
      alert("Please fill in all required fields");
      return;
    }

    setSubmittingBom(true);
    try {
      const payload: any = {
        bom_code: bomForm.bom_code,
        product_id: parseInt(bomForm.product_id),
        variant_id: parseInt(bomForm.variant_id),
        revision_code: bomForm.revision_code,
        unit_id: parseInt(bomForm.unit_id),
        effective_from: bomForm.effective_from,
        is_active: 1, // Default to active
        // multi-tenant: these should be validated/enforced by backend from token,
        // but we also send them for compatibility
        company_id: user?.company_id,
        branch_id: user?.branch_id ?? null,
      };

      if (bomForm.effective_to) {
        payload.effective_to = bomForm.effective_to;
      }

      if (bomForm.notes) {
        payload.notes = bomForm.notes;
      }

      const response = await api.post("/production/boms", payload);
      if (response.error) {
        setErrorMessage(response.error);
        setTimeout(() => setErrorMessage(null), 5000);
      } else {
        // Show success message immediately
        setSuccessMessage("BOM created successfully!");
        
        // Refresh BOM list first
        const bomsRes = await api.get<any[]>("/production/bom-definitions");
        if (bomsRes.data && Array.isArray(bomsRes.data)) {
          setBomList(bomsRes.data);
        }
        
        // Close form and reset after a brief delay to show notification
        setTimeout(() => {
          setShowAddBomForm(false);
          setBomForm({
            bom_code: '',
            product_id: '',
            variant_id: '',
            revision_code: '',
            unit_id: '',
            effective_from: '',
            effective_to: '',
            notes: ''
          });
        }, 100);
        
        // Auto-dismiss notification after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (error: any) {
      console.error("Error submitting BOM:", error);
      setErrorMessage(error.message || "Failed to create BOM");
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setSubmittingBom(false);
    }
  };

  // Handle Edit BOM Item
  const handleEditBomItem = (item: any) => {
    console.log("Editing BOM item:", item);
    setEditingBomItem(item);
    editingBomItemRef.current = item;
    // Open the form first, then set the form state after data loads
    setShowAddBomItemForm(true);
    // Form state will be set in the useEffect after data loads
  };

  // Handle Delete BOM Item
  const handleDeleteBomItem = (item: any) => {
    setConfirmDialog({
      open: true,
      title: "Delete BOM Item",
      message: `Are you sure you want to delete this BOM item? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        try {
          const response = await api.delete(`/production/bom-items/${item.id || item.bom_item_id}`);
          if (response.error) {
            setErrorMessage(response.error);
            setTimeout(() => setErrorMessage(null), 5000);
          } else {
            setSuccessMessage("BOM item deleted successfully!");
            setTimeout(() => setSuccessMessage(null), 5000);
            // Refresh BOM data
            const bomRes = await api.get<BOMItem[]>("/production/bom");
            if (bomRes.data) {
              setBomData(bomRes.data);
            }
          }
        } catch (error: any) {
          console.error("Error deleting BOM item:", error);
          setErrorMessage(error.message || "Failed to delete BOM item");
          setTimeout(() => setErrorMessage(null), 5000);
        } finally {
          setConfirmDialog(null);
        }
      }
    });
  };

  // Handle Edit BOM
  const handleEditBom = async (bom: any) => {
    console.log("Editing BOM:", bom);
    setEditingBom(bom);
    
    // Generate BOM code if not present
    let bomCode = bom.bom_code || '';
    if (!bomCode && bom.product && bom.revision_code) {
      const productPrefix = bom.product
        .substring(0, 4)
        .replace(/\s+/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();
      const revision = bom.revision_code.toUpperCase().replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
      bomCode = `${productPrefix}-${revision}`;
    }
    
    setBomForm({
      bom_code: bomCode,
      product_id: String(bom.product_id || ''),
      revision_code: bom.revision_code || '',
      unit_id: String(bom.unit_id || ''),
      effective_from: bom.effective_from ? new Date(bom.effective_from).toISOString().split('T')[0] : '',
      effective_to: bom.effective_to ? new Date(bom.effective_to).toISOString().split('T')[0] : '',
      notes: bom.notes || ''
    });
    setShowAddBomForm(true);
  };

  // Handle Delete BOM
  const handleDeleteBom = (bom: any) => {
    setConfirmDialog({
      open: true,
      title: "Delete BOM",
      message: `Are you sure you want to delete the BOM "${bom.bom_code || bom.bom_id}"? This will also delete all associated BOM items. This action cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        try {
          const response = await api.delete(`/production/boms/${bom.bom_id}`);
          if (response.error) {
            setErrorMessage(response.error);
            setTimeout(() => setErrorMessage(null), 5000);
          } else {
            setSuccessMessage("BOM deleted successfully!");
            setTimeout(() => setSuccessMessage(null), 5000);
            // Refresh BOM list
            const refreshResponse = await api.get<any[]>("/production/bom-definitions");
            if (refreshResponse.data) {
              setBomList(Array.isArray(refreshResponse.data) ? refreshResponse.data : []);
            }
          }
        } catch (error: any) {
          console.error("Error deleting BOM:", error);
          setErrorMessage(error.message || "Failed to delete BOM");
          setTimeout(() => setErrorMessage(null), 5000);
        } finally {
          setConfirmDialog(null);
        }
      }
    });
  };

  // Generate alerts from stats
  const alerts: Alert[] = useMemo(() => {
    const alertList: Alert[] = [];
    if (stats.rawMaterialsLow > 0) {
      alertList.push({
        type: 'warning',
        message: `LOW MATERIALS: ${stats.rawMaterialsLow} raw materials below reorder point`,
        count: stats.rawMaterialsLow
      });
    }
    if (stats.equipmentIssues > 0) {
      alertList.push({
        type: 'warning',
        message: `MAINTENANCE DUE: ${stats.equipmentIssues} equipment items need attention`,
        count: stats.equipmentIssues
      });
    }
    const failedQC = pendingQC.filter(q => q.status === 'failed').length;
    if (failedQC > 0) {
      alertList.push({
        type: 'danger',
        message: `QUALITY ISSUE: ${failedQC} batches failed QC inspection`,
        count: failedQC
      });
    }
    const haltedOrders = productionOrders.filter(o => o.status === 'halted').length;
    if (haltedOrders > 0) {
      alertList.push({
        type: 'danger',
        message: `CRITICAL: ${haltedOrders} production orders halted`,
        count: haltedOrders
      });
    }
    return alertList;
  }, [stats, pendingQC, productionOrders]);

  const roleLabel = useMemo(() => {
    if (!user) return "User";
    if (user.role_name) return user.role_name;
    if (user.role_code) {
      return user.role_code
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }
    if (user.is_company_admin && user.company_id) return "Company Admin";
    if (user.is_super_admin) return "Super Admin";
    if (user.is_branch_admin) return "Branch Admin";
    return "User";
  }, [user]);

  const formatLabel = (value?: string | null) => {
    if (!value) return "Activity";
    return value
      .replace(/[_-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatRelativeTime = (input: string) => {
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) {
      return input;
    }
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
  };

  const renderDashboard = () => {
    if (statsLoading) {
      return (
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      );
    }

    return (
    <div className="p-6">
      {/* Alerts Section */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">URGENT ACTION REQUIRED</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alerts.map((alert, i) => (
            <div key={i} className={`p-4 rounded-lg border-l-4 ${
              alert.type === 'danger' ? 'bg-red-50 border-red-500' : 'bg-orange-50 border-orange-500'
            }`}>
              <p className={`font-semibold text-sm ${
                alert.type === 'danger' ? 'text-red-900' : 'text-orange-900'
              }`}>
                {alert.message}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm text-gray-600">Production Today</p>
              <p className="text-3xl font-bold text-gray-900">{stats.todayProduction}</p>
              <p className="text-xs text-gray-500">Target: {stats.targetProduction} units</p>
            </div>
            <Factory className="w-8 h-8 text-blue-600" />
          </div>
          <div className="pt-3 border-t">
            <p className="text-xs text-green-600">Efficiency: {stats.efficiencyRate}%</p>
            <button className="text-xs text-blue-600 hover:underline mt-1">View Details →</button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm text-gray-600">Active Orders</p>
              <p className="text-3xl font-bold text-gray-900">{stats.activeOrders}</p>
              <p className="text-xs text-gray-500">In Progress: {stats.activeOrders} | Planned: {stats.pendingOrders}</p>
            </div>
            <ClipboardList className="w-8 h-8 text-green-600" />
          </div>
          <div className="pt-3 border-t">
            <button 
              onClick={() => setActiveSection('orders')}
              className="text-xs text-blue-600 hover:underline"
            >
              Production Orders →
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm text-gray-600">Quality Alerts</p>
              <p className="text-3xl font-bold text-red-600">{pendingQC.length}</p>
              <p className="text-xs text-gray-500">Failed: 1 | Pending: 1</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <div className="pt-3 border-t">
            <button 
              onClick={() => setActiveSection('quality')}
              className="text-xs text-blue-600 hover:underline"
            >
              Review Issues →
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm text-gray-600">Workers On Shift</p>
              <p className="text-3xl font-bold text-gray-900">{stats.workersOnShift}</p>
              <p className="text-xs text-gray-500">Morning Shift (6AM-2PM)</p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
          <div className="pt-3 border-t">
            <button className="text-xs text-blue-600 hover:underline">View Assignments →</button>
          </div>
        </div>
      </div>

      {/* Production Orders - HALTED */}
      <div className="mb-6 bg-white rounded-lg border border-red-300 overflow-hidden">
        <div className="bg-red-50 px-4 py-3 border-b border-red-200">
          <h3 className="font-bold text-red-900">Halted Production (CRITICAL)</h3>
          <p className="text-sm text-red-700">1 order cannot proceed - immediate action required</p>
          <button 
            onClick={() => setActiveSection('orders')}
            className="text-sm text-red-600 hover:underline mt-1"
          >
            View All →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Order #</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Product</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Target Qty</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Orders Affected</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Reason</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {productionOrders.filter(o => o.status === 'halted').map(order => (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm font-semibold">{order.orderNum}</td>
                  <td className="px-4 py-3 text-sm">{order.product}</td>
                  <td className="px-4 py-3 text-sm font-semibold">{order.targetQty}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-red-600">{order.ordersAffected} sales orders</td>
                  <td className="px-4 py-3 text-sm text-red-600">{order.reason}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 mr-2">
                      Request Materials
                    </button>
                    <button className="px-3 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50">
                      <Eye className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw Materials Status */}
      <div className="mb-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h3 className="font-bold text-gray-900">Raw Materials - Critical & Low Stock</h3>
          <p className="text-sm text-gray-600">Materials needed for production</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">SKU</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Material Name</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Current</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Required</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rawMaterials.filter(m => m.status !== 'sufficient').map(mat => (
                <tr key={mat.sku} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">{mat.sku}</td>
                  <td className="px-4 py-3 text-sm font-medium">{mat.name}</td>
                  <td className="px-4 py-3 text-sm font-semibold">{mat.current}</td>
                  <td className="px-4 py-3 text-sm">{mat.required}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      mat.status === 'critical' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {mat.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">
                      Request Reorder
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Production Orders Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-2">In Progress</p>
          <p className="text-3xl font-bold text-green-600">
            {productionOrders.filter(o => o.status === 'in_progress').length}
          </p>
          <button 
            onClick={() => setActiveSection('orders')}
            className="text-sm text-blue-600 hover:underline mt-2"
          >
            View Orders
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-2">Planned</p>
          <p className="text-3xl font-bold text-blue-600">
            {productionOrders.filter(o => o.status === 'planned').length}
          </p>
          <button className="text-sm text-blue-600 hover:underline mt-2">Start Production</button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-2">Halted</p>
          <p className="text-3xl font-bold text-red-600">
            {productionOrders.filter(o => o.status === 'halted').length}
          </p>
          <button className="text-sm text-blue-600 hover:underline mt-2">Resolve Issues</button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-2">Completed Today</p>
          <p className="text-3xl font-bold text-gray-900">{stats.completedToday}</p>
          <button className="text-sm text-blue-600 hover:underline mt-2">View Completed</button>
        </div>
      </div>

      {/* Quality Control - Pending Approval */}
      <div className="mb-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h3 className="font-bold text-gray-900">Quality Control - Pending Review</h3>
          <div className="flex gap-2 mt-2">
            <button className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">✓ Approve Selected</button>
            <button className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">✗ Reject Selected</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Batch #</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Product</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Quantity</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Issue</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Age</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingQC.map(qc => (
                <tr key={qc.batch} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">{qc.batch}</td>
                  <td className="px-4 py-3 text-sm">{qc.product}</td>
                  <td className="px-4 py-3 text-sm font-semibold">{qc.qty}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      qc.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {qc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-red-600">{qc.issue || '-'}</td>
                  <td className="px-4 py-3 text-sm">{qc.age}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-green-600 hover:underline text-sm mr-2">✓</button>
                    <button className="text-red-600 hover:underline text-sm mr-2">✗</button>
                    <button className="text-blue-600 hover:underline text-sm">
                      <Eye className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-bold text-gray-900 mb-4">Quick Actions - Common Tasks</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-sm font-medium">
            Start Production Order
          </button>
          <button className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-sm font-medium">
            Record Production Output
          </button>
          <button className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-sm font-medium">
            Request Raw Materials
          </button>
          <button className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-sm font-medium">
            Quality Check Report
          </button>
          <button className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-sm font-medium">
            Assign Workers
          </button>
          <button className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-sm font-medium">
            Report Equipment Issue
          </button>
          <button 
            onClick={() => setActiveSection('wip')}
            className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-sm font-medium"
          >
            View WIP Status
          </button>
          <button className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-sm font-medium">
            Daily Production Report
          </button>
        </div>
      </div>
    </div>
    );
  };

  // Profile Tab
  const renderProfile = () => {
    if (!user) {
      return (
        <div className="p-6 min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
              <UserIcon className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900">Sign in to view your profile</p>
          </div>
        </div>
      );
    }

    const loginTime = user.last_login || user.last_login_at;

    return (
      <div className="p-6 space-y-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Profile Header Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row items-start gap-6">
              <div className="relative pb-8">
                <div className="h-24 w-24 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-3xl font-bold uppercase text-blue-700">
                  {user.first_name?.[0] || 'U'}
                  {user.last_name?.[0] || ''}
                </div>
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs uppercase tracking-widest text-emerald-600 font-bold bg-white px-2 py-0.5 rounded-full shadow-sm border border-emerald-300">
                  Active
                </span>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.4em] text-gray-500 font-bold">User Profile</p>
                  <h1 className="text-3xl font-semibold text-gray-900">
                    {user.first_name || ''} {user.last_name || ''}
                  </h1>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full px-3 py-1 text-xs font-semibold tracking-wide bg-blue-100 text-blue-700 border border-blue-200">
                    Role: {roleLabel}
                  </span>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold tracking-wide bg-emerald-100 text-emerald-700 border border-emerald-200">
                    Status: {user.status || "active"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Workspace Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Workspace Details</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Company ID</span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
                    {user.company_id ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Branch ID</span>
                  <span className="text-gray-900 font-semibold">{user.branch_id ?? "—"}</span>
                </div>
                {loginTime && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Last Login</span>
                    <span className="text-gray-900">{new Date(loginTime).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Access & Permissions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Access & Permissions</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <span className="text-gray-900">Operations Console</span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold border border-emerald-200 bg-emerald-100 text-emerald-700">
                    Enabled
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <span className="text-gray-900">Catalog & Inventory</span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold border border-emerald-200 bg-emerald-100 text-emerald-700">
                    Enabled
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <span className="text-gray-900">Compliance Suite</span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold border border-amber-200 bg-amber-100 text-amber-700">
                    Pending
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div>
              {activityLoading ? (
                <div className="flex items-center justify-center py-6">
                  <LoadingSpinner size="sm" />
                </div>
              ) : activity.length > 0 ? (
                <div className="space-y-4">
                  {activity.map((item, idx) => (
                    <div key={`${item.action_type}-${item.created_at}-${idx}`} className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition">
                      <p className="font-semibold text-gray-900">{item.description ?? `${formatLabel(item.action_type)} ${formatLabel(item.entity_type)}`}</p>
                      <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">{formatRelativeTime(item.created_at)}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {item.entity_type ? `${formatLabel(item.entity_type)} · ${new Date(item.created_at).toLocaleString()}` : new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
                  {activityError ?? "No recent activity recorded for this workspace yet."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Production Orders
  const renderProductionOrders = () => {
    if (productionOrdersLoading) {
      return (
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      );
    }

    return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Production Orders</h2>
          <p className="text-sm text-gray-600 mt-1">Manage and track all production orders</p>
        </div>
        <button 
          onClick={() => setShowNewOrderForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Order
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900">{productionOrders.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">In Progress</p>
          <p className="text-2xl font-bold text-green-600">{productionOrders.filter(o => o.status === 'in_progress').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Halted</p>
          <p className="text-2xl font-bold text-red-600">{productionOrders.filter(o => o.status === 'halted').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Completed</p>
          <p className="text-2xl font-bold text-blue-600">{productionOrders.filter(o => o.status === 'completed').length}</p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Order #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Target Qty</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Produced</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Progress</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Priority</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {productionOrders.map(order => {
                const progress = (order.producedQty / order.targetQty) * 100;
                return (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm font-semibold">{order.orderNum}</td>
                    <td className="px-4 py-3 text-sm">{order.product}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{order.targetQty}</td>
                    <td className="px-4 py-3 text-sm">{order.producedQty}</td>
                    <td className="px-4 py-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                      </div>
                      <span className="text-xs text-gray-600 mt-1">{Math.round(progress)}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'in_progress' ? 'bg-green-100 text-green-800' :
                        order.status === 'halted' ? 'bg-red-100 text-red-800' :
                        order.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        order.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-blue-600 hover:underline text-sm mr-2">View</button>
                      <button className="text-green-600 hover:underline text-sm">Edit</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Production Order Form Modal */}
      <Modal
        open={showNewOrderForm}
        onClose={() => {
          setShowNewOrderForm(false);
          setNewOrderForm({
            product_finished_id: '',
            batch_code: '',
            quantity_planned: '',
            unit_id: '',
            location_id: '',
            bom_id: '',
            planned_start_date: '',
            planned_end_date: '',
            status: 'planned',
            priority: 'normal',
            supervisor_id: '',
            notes: ''
          });
        }}
        title="Create New Production Order"
        size="lg"
      >
        <div className="space-y-4">
          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product to Manufacture *
            </label>
            {productsLoading ? (
              <div className="flex items-center justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              <select
                value={newOrderForm.product_finished_id}
                onChange={(e) => {
                  const selectedProduct = products.find((p: any) => p.product_id === parseInt(e.target.value));
                  setNewOrderForm({ 
                    ...newOrderForm, 
                    product_finished_id: e.target.value,
                    unit_id: selectedProduct?.unit_id || ''
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a product...</option>
                {products
                  .filter((p: any) => p.product_type === 'finished_good' || p.product_type === 'packaged')
                  .map((product: any) => (
                    <option key={product.product_id} value={product.product_id}>
                      {product.name} {product.sku ? `(${product.sku})` : ''}
                    </option>
                  ))}
              </select>
            )}
          </div>

          {/* Batch Code and Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Code * (Auto-generated)
              </label>
              <input
                type="text"
                value={newOrderForm.batch_code}
                onChange={(e) => setNewOrderForm({ ...newOrderForm, batch_code: e.target.value })}
                placeholder="BATCH-YYYYMMDD-XXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity Planned *
              </label>
              <input
                type="number"
                value={newOrderForm.quantity_planned}
                onChange={(e) => setNewOrderForm({ ...newOrderForm, quantity_planned: e.target.value })}
                placeholder="0"
                min="0.01"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Unit of Measure and Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit of Measure *
              </label>
              {unitsLoading ? (
                <div className="flex items-center justify-center py-2">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <select
                  value={newOrderForm.unit_id}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, unit_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select unit...</option>
                  {units.map((unit: any) => (
                    <option key={unit.unit_id} value={unit.unit_id}>
                      {unit.name} ({unit.short_code || unit.code || ''})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Production Location *
              </label>
              {locationsLoading ? (
                <div className="flex items-center justify-center py-2">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <select
                  value={newOrderForm.location_id}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, location_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select location...</option>
                  {locations.map((location: any) => (
                    <option key={location.location_id} value={location.location_id}>
                      {location.name} {location.code ? `(${location.code})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* BOM Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bill of Materials (BOM) *
            </label>
            {bomsLoading ? (
              <div className="flex items-center justify-center py-2">
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              <select
                value={newOrderForm.bom_id}
                onChange={(e) => setNewOrderForm({ ...newOrderForm, bom_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Auto-select BOM (or use default)</option>
                {(() => {
                  // Get unique BOMs grouped by bom_id
                  const uniqueBoms = new Map();
                  boms.forEach((bom: any) => {
                    if (bom.bom_id && (!newOrderForm.product_finished_id || bom.product_id === parseInt(newOrderForm.product_finished_id))) {
                      if (!uniqueBoms.has(bom.bom_id)) {
                        uniqueBoms.set(bom.bom_id, bom);
                      }
                    }
                  });
                  return Array.from(uniqueBoms.values()).map((bom: any) => (
                    <option key={bom.bom_id} value={bom.bom_id}>
                      {bom.product || 'BOM'} {bom.revision_code ? `(v${bom.revision_code})` : ''}
                    </option>
                  ));
                })()}
              </select>
            )}
            {newOrderForm.product_finished_id && boms.filter((bom: any) => bom.product_id === parseInt(newOrderForm.product_finished_id)).length === 0 && (
              <p className="text-xs text-amber-600 mt-1">⚠️ No BOM found for this product. A default BOM will be used.</p>
            )}
            <p className="text-xs text-gray-500 mt-1">If no BOM is selected, the system will use the default BOM for this product.</p>
          </div>

          {/* Planned Start and End Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Planned Start Date *
              </label>
              <input
                type="datetime-local"
                value={newOrderForm.planned_start_date}
                onChange={(e) => setNewOrderForm({ ...newOrderForm, planned_start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Planned End Date
              </label>
              <input
                type="datetime-local"
                value={newOrderForm.planned_end_date}
                onChange={(e) => setNewOrderForm({ ...newOrderForm, planned_end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min={newOrderForm.planned_start_date}
              />
            </div>
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                value={newOrderForm.status}
                onChange={(e) => setNewOrderForm({ ...newOrderForm, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Note: New orders should start as "Planned"</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={newOrderForm.priority}
                onChange={(e) => setNewOrderForm({ ...newOrderForm, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Supervisor (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Responsible Supervisor
            </label>
            <input
              type="text"
              value={newOrderForm.supervisor_id}
              onChange={(e) => setNewOrderForm({ ...newOrderForm, supervisor_id: e.target.value })}
              placeholder="Enter supervisor name or ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Optional: Name or ID of the production supervisor</p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={newOrderForm.notes}
              onChange={(e) => setNewOrderForm({ ...newOrderForm, notes: e.target.value })}
              placeholder="Additional notes or instructions..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setShowNewOrderForm(false);
                setNewOrderForm({
                  product_finished_id: '',
                  batch_code: '',
                  quantity_planned: '',
                  unit_id: '',
                  location_id: '',
                  bom_id: '',
                  planned_start_date: '',
                  planned_end_date: '',
                  status: 'planned',
                  priority: 'normal',
                  supervisor_id: '',
                  notes: ''
                });
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={submittingOrder}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                // Validation
                if (!newOrderForm.product_finished_id || !newOrderForm.batch_code || !newOrderForm.quantity_planned || !newOrderForm.planned_start_date) {
                  alert('Please fill in all required fields');
                  return;
                }
                if (parseFloat(newOrderForm.quantity_planned) <= 0) {
                  alert('Quantity must be greater than 0');
                  return;
                }
                if (!newOrderForm.unit_id || !newOrderForm.location_id) {
                  alert('Please select Unit of Measure and Production Location');
                  return;
                }
                if (!newOrderForm.planned_start_date) {
                  alert('Please select Planned Start Date');
                  return;
                }
                
                setSubmittingOrder(true);
                try {
                  const response = await api.post('/production/orders', {
                    product_finished_id: parseInt(newOrderForm.product_finished_id),
                    batch_code: newOrderForm.batch_code,
                    quantity_planned: parseFloat(newOrderForm.quantity_planned),
                    unit_id: parseInt(newOrderForm.unit_id),
                    location_id: parseInt(newOrderForm.location_id),
                    bom_id: newOrderForm.bom_id ? parseInt(newOrderForm.bom_id) : null,
                    planned_start_date: newOrderForm.planned_start_date,
                    planned_end_date: newOrderForm.planned_end_date || null,
                    production_date: newOrderForm.planned_start_date, // For backward compatibility
                    status: newOrderForm.status,
                    priority: newOrderForm.priority,
                    supervisor_id: newOrderForm.supervisor_id || null,
                    notes: newOrderForm.notes || null
                  });
                  if (response.error) {
                    alert('Error creating production order: ' + response.error);
                  } else {
                    // Refresh production orders
                    const ordersResponse = await api.get<ProductionOrder[]>("/production/orders");
                    if (ordersResponse.data) {
                      setProductionOrders(ordersResponse.data || []);
                    }
                    setShowNewOrderForm(false);
                    setNewOrderForm({
                      product_finished_id: '',
                      batch_code: '',
                      quantity_planned: '',
                      unit_id: '',
                      location_id: '',
                      bom_id: '',
                      planned_start_date: '',
                      planned_end_date: '',
                      status: 'planned',
                      priority: 'normal',
                      supervisor_id: '',
                      notes: ''
                    });
                  }
                } catch (error) {
                  console.error('Error creating production order:', error);
                  alert('Failed to create production order');
                } finally {
                  setSubmittingOrder(false);
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={submittingOrder}
            >
              {submittingOrder ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
    );
  };

  // Render Work-In-Progress
  const renderWIP = () => {
    // Use the filtered data and stats from top-level hooks

    const getStatusColor = (status: string) => {
      switch (status?.toLowerCase()) {
        case 'in_progress':
          return 'bg-blue-100 text-blue-800';
        case 'planned':
          return 'bg-yellow-100 text-yellow-800';
        case 'completed':
          return 'bg-green-100 text-green-800';
        case 'halted':
          return 'bg-red-100 text-red-800';
        case 'cancelled':
          return 'bg-gray-100 text-gray-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    const getStatusLabel = (status: string) => {
      switch (status?.toLowerCase()) {
        case 'in_progress':
          return 'In Progress';
        case 'planned':
          return 'Planned';
        case 'completed':
          return 'Completed';
        case 'halted':
          return 'Halted';
        case 'cancelled':
          return 'Cancelled';
        default:
          return status || 'Unknown';
      }
    };

    if (wipLoading) {
      return (
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      );
    }

    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Work-In-Progress</h2>
            <p className="text-sm text-gray-600 mt-1">Monitor products currently being manufactured</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Total WIP Items</p>
            <p className="text-2xl font-bold text-gray-900">{wipStats.total}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{wipStats.inProgress}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Total Quantity</p>
            <p className="text-2xl font-bold text-gray-900">{wipStats.totalQuantity.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Avg. Completion</p>
            <p className="text-2xl font-bold text-green-600">{wipStats.avgCompletion}%</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by product, batch code, or line..."
                value={wipSearchQuery}
                onChange={(e) => setWipSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="md:w-48">
              <select
                value={wipStatusFilter}
                onChange={(e) => setWipStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="halted">Halted</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* WIP Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Batch Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Line</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Progress</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWipData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                      <div className="flex flex-col items-center gap-3">
                        <Package className="h-10 w-10 text-gray-400" />
                        <p className="text-lg font-semibold text-gray-900">No WIP items found</p>
                        <p className="text-sm">
                          {wipSearchQuery || wipStatusFilter !== 'all'
                            ? 'Try adjusting your filters'
                            : 'No products are currently in progress'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredWipData.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm">{item.batch_code || `#${item.id}`}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.product || 'N/A'}</p>
                          {item.sku && (
                            <p className="text-xs text-gray-500 font-mono">{item.sku}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <p className="font-semibold">{item.qty?.toLocaleString() || 0}</p>
                          {item.quantity_planned && (
                            <p className="text-xs text-gray-500">of {item.quantity_planned.toLocaleString()} planned</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.line || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.stage)}`}>
                          {getStatusLabel(item.stage)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px]">
                            <div
                              className="bg-green-600 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(item.completion || 0, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600 font-medium w-12 text-right">
                            {Math.round(item.completion || 0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setViewingWip(item)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* View WIP Details Modal */}
        {viewingWip && (
          <Modal
            open={!!viewingWip}
            onClose={() => setViewingWip(null)}
            title="WIP Item Details"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Code</label>
                  <p className="text-sm text-gray-900">{viewingWip.batch_code || `#${viewingWip.id}`}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(viewingWip.stage)}`}>
                    {getStatusLabel(viewingWip.stage)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                  <p className="text-sm text-gray-900">{viewingWip.product || 'N/A'}</p>
                  {viewingWip.sku && (
                    <p className="text-xs text-gray-500 font-mono">{viewingWip.sku}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Production Line</label>
                  <p className="text-sm text-gray-900">{viewingWip.line || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Produced</label>
                  <p className="text-sm text-gray-900 font-semibold">{viewingWip.qty?.toLocaleString() || 0}</p>
                </div>
                {viewingWip.quantity_planned && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Planned</label>
                    <p className="text-sm text-gray-900">{viewingWip.quantity_planned.toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Completion</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${Math.min(viewingWip.completion || 0, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 font-medium">
                      {Math.round(viewingWip.completion || 0)}%
                    </span>
                  </div>
                </div>
                {viewingWip.production_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Production Date</label>
                    <p className="text-sm text-gray-900">
                      {new Date(viewingWip.production_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
              <div className="pt-4 border-t">
                <button
                  onClick={() => setViewingWip(null)}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  };

  // Render Bill of Materials
  const renderBOM = () => {
    return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bill of Materials</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage materials required for production
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setBomTab('items')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            bomTab === 'items'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Package className="w-4 h-4 inline mr-2" />
          BOM Item
        </button>
        <button
          onClick={() => setBomTab('boms')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            bomTab === 'boms'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <ClipboardList className="w-4 h-4 inline mr-2" />
          BOM
        </button>
      </div>

      {/* BOM Items Tab */}
      {bomTab === 'items' && (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">BOM Items</h2>
              <p className="text-sm text-gray-600 mt-1">Manage materials required for production</p>
            </div>
            <button 
              onClick={() => setShowAddBomItemForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add BOM Item
            </button>
          </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">BOM</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Material</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Unit</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bomLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : bomData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-10 w-10 text-gray-400" />
                      <p className="text-sm font-medium">No BOM items found</p>
                      <p className="text-xs">Create a BOM and add items to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                bomData.map(item => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{item.product}</td>
                    <td className="px-4 py-3 text-sm">{item.material}</td>
                    <td className="px-4 py-3 font-mono text-sm">{item.materialSku}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.unit}</td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => handleEditBomItem(item)}
                        className="text-blue-600 hover:underline text-sm mr-2"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteBomItem(item)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* BOM Tab */}
      {bomTab === 'boms' && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Bill of Materials</h2>
            <button 
              onClick={() => setShowAddBomForm(true)}
              className="px-4 py-2 text-emerald-500 hover:text-emerald-200 border-transparent hover:bg-transparent shadow-none cursor-pointer transition-colors duration-150 ease-in-out flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add BOM
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Available BOMs</h3>
              <p className="text-xs text-gray-600 mt-1">
                {bomList.length === 0
                  ? "No BOMs found. Create your first BOM to get started."
                  : `Total: ${bomList.length} BOM${bomList.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">BOM ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Revision</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Effective From</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Effective To</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bomList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                        <div className="flex flex-col items-center gap-3">
                          <ClipboardList className="h-10 w-10 text-blue-600" />
                          <p className="text-lg font-semibold text-gray-900">No BOMs yet</p>
                          <p className="text-sm">Create your first BOM to get started.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    bomList.map((bom: any) => (
                      <tr key={bom.bom_id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium">#{bom.bom_id}</td>
                        <td className="px-4 py-3 text-sm font-medium">{bom.product || 'N/A'}</td>
                        <td className="px-4 py-3 font-mono text-sm">{bom.sku || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">{bom.revision_code || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            bom.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {bom.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {bom.effective_from 
                            ? new Date(bom.effective_from).toLocaleDateString() 
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {bom.effective_to 
                            ? new Date(bom.effective_to).toLocaleDateString() 
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => handleEditBom(bom)}
                            className="text-blue-600 hover:underline text-sm mr-2"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteBom(bom)}
                            className="text-red-600 hover:underline text-sm"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add BOM Item Form Modal */}
      {showAddBomItemForm && (
        <Modal
          open={showAddBomItemForm}
          onClose={() => {
            setShowAddBomItemForm(false);
            // Clear editing state
            setTimeout(() => {
              setEditingBomItem(null);
              editingBomItemRef.current = null;
              setBomItemForm({
                bom_id: '',
                component_product_id: '',
                component_quantity: '',
                unit_id: '',
                scrap_factor: ''
              });
            }, 100);
          }}
          title={editingBomItem ? "Edit BOM Item" : "Add BOM Item"}
        >
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            {/* BOM Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Bill of Materials (BOM) *
              </label>
              {bomListLoading ? (
                <div className="text-sm text-gray-500">Loading BOMs...</div>
              ) : (
                <select
                  value={bomItemForm.bom_id}
                  onChange={(e) => setBomItemForm({ ...bomItemForm, bom_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={!!editingBomItem}
                >
                  <option value="">Select a BOM</option>
                  {bomList.map((bom) => (
                    <option key={bom.bom_id} value={bom.bom_id}>
                      {bom.product} {bom.sku ? `(${bom.sku})` : ''} {bom.revision_code ? `- Rev ${bom.revision_code}` : ''}
                    </option>
                  ))}
                </select>
              )}
              {bomList.length === 0 && !bomListLoading && (
                <p className="text-xs text-amber-600 mt-1">⚠️ No BOMs found. Please create a BOM first.</p>
              )}
            </div>

            {/* Component Product (Raw Material) */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Component Material (Raw Material) *
              </label>
              {bomFormMaterialsLoading ? (
                <div className="text-sm text-gray-500">Loading materials...</div>
              ) : (
                <select
                  value={bomItemForm.component_product_id}
                  onChange={(e) => setBomItemForm({ ...bomItemForm, component_product_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={!!editingBomItem}
                >
                  <option value="">Select a raw material</option>
                  {bomFormMaterials.map((material: any) => (
                    <option key={material.product_id} value={material.product_id}>
                      {material.name} {material.sku ? `(${material.sku})` : ''}
                    </option>
                  ))}
                </select>
              )}
              {bomFormMaterials.length === 0 && !bomFormMaterialsLoading && (
                <p className="text-xs text-amber-600 mt-1">⚠️ No raw materials found. Please add raw materials first.</p>
              )}
            </div>

            {/* Component Quantity */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Quantity Required *
              </label>
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                value={bomItemForm.component_quantity}
                onChange={(e) => setBomItemForm({ ...bomItemForm, component_quantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.0000"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Enter the quantity of this material needed per unit of finished product</p>
            </div>

            {/* Unit of Measure */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Unit of Measure *
              </label>
              {unitsLoading ? (
                <div className="text-sm text-gray-500">Loading units...</div>
              ) : (
                <select
                  value={bomItemForm.unit_id}
                  onChange={(e) => setBomItemForm({ ...bomItemForm, unit_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a unit</option>
                  {units.map((unit: any) => (
                    <option key={unit.unit_id} value={unit.unit_id}>
                      {unit.name} {unit.symbol ? `(${unit.symbol})` : ''}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-500 mt-1">Select the unit used during production (may differ from storage unit)</p>
              {units.length === 0 && !unitsLoading && (
                <p className="text-xs text-amber-600 mt-1">⚠️ No units found. Please add units first.</p>
              )}
            </div>

            {/* Scrap Factor */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Scrap Factor (%) <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={bomItemForm.scrap_factor}
                onChange={(e) => setBomItemForm({ ...bomItemForm, scrap_factor: e.target.value })}
                onWheel={(e) => {
                  // Prevent mouse wheel from changing the value (common cause of unexpected decimals)
                  (e.target as HTMLInputElement).blur();
                  e.preventDefault();
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">Expected waste percentage (0-100). Used to calculate additional material needed.</p>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => {
                  setShowAddBomItemForm(false);
                  setBomItemForm({
                    bom_id: '',
                    component_product_id: '',
                    component_quantity: '',
                    unit_id: '',
                    scrap_factor: ''
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={submittingBomItem}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitBomItem}
                disabled={submittingBomItem || !bomItemForm.bom_id || !bomItemForm.component_product_id || !bomItemForm.component_quantity || !bomItemForm.unit_id}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submittingBomItem ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2 inline" />
                    {editingBomItem ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  <>
                    {editingBomItem ? 'Update Item' : 'Add Item'}
                  </>
                )}
              </button>
            </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Add BOM Form Modal */}
      {showAddBomForm && (
        <Modal
          open={showAddBomForm}
          onClose={() => {
            setShowAddBomForm(false);
            setEditingBom(null);
            setBomForm({
              bom_code: '',
              product_id: '',
              revision_code: '',
              unit_id: '',
              effective_from: '',
              effective_to: '',
              notes: ''
            });
          }}
          title={editingBom ? "Edit BOM" : "Create New BOM"}
        >
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            {/* BOM Code / ID */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                BOM Code / ID *
              </label>
              <input
                type="text"
                value={bomForm.bom_code}
                onChange={(e) => setBomForm({ ...bomForm, bom_code: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  bomForm.product_id && bomForm.revision_code && bomForm.bom_code
                    ? 'bg-green-50 border-green-300'
                    : editingBom
                    ? 'bg-gray-100 cursor-not-allowed'
                    : ''
                }`}
                placeholder="e.g., YOG-V1"
                required
                readOnly={!!(bomForm.product_id && bomForm.revision_code) || !!editingBom}
                disabled={!!editingBom}
              />
              {bomForm.product_id && bomForm.revision_code && bomForm.bom_code ? (
                <p className="text-xs text-green-600 mt-1">✓ Auto-generated from product name and revision</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  {bomForm.product_id && bomForm.revision_code 
                    ? "Auto-generated from product name and revision" 
                    : "Will be auto-generated when product and revision are selected"}
                </p>
              )}
            </div>

            {/* Finished Product */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Finished Product *
              </label>
              {finishedProductsLoading ? (
                <div className="text-sm text-gray-500">Loading products...</div>
              ) : (
                <select
                  value={bomForm.product_id}
                  disabled={!!editingBom}
                  onChange={(e) => {
                    const selectedProduct = finishedProducts.find((p: any) => p.product_id === parseInt(e.target.value));
                    console.log("Selected product:", selectedProduct);
                    console.log("Available units:", units);
                    
                    // Reset variant selection when product changes; unit may be auto-filled from variant later
                    if (selectedProduct && selectedProduct.unit_id) {
                      // Convert unit_id to string to match select option values
                      const unitIdStr = String(selectedProduct.unit_id);
                      // Check if the unit exists in the units array
                      const unitExists = units.some((u: any) => String(u.unit_id) === unitIdStr);
                      
                      console.log(`Product unit_id: ${selectedProduct.unit_id}, Unit exists: ${unitExists}`);
                      
                      if (unitExists) {
                        setBomForm({ 
                          ...bomForm, 
                          product_id: e.target.value,
                          unit_id: unitIdStr,
                          variant_id: ''
                        });
                      } else {
                        console.warn(`Unit ${selectedProduct.unit_id} not found in units array`);
                        setBomForm({ 
                          ...bomForm, 
                          product_id: e.target.value,
                          unit_id: unitIdStr, // Set it anyway, might be a timing issue
                          variant_id: ''
                        });
                      }
                    } else {
                      console.warn("Selected product has no unit_id");
                      setBomForm({ 
                        ...bomForm, 
                        product_id: e.target.value,
                        variant_id: ''
                      });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a finished product</option>
                  {finishedProducts.map((product: any) => (
                    <option key={product.product_id} value={product.product_id}>
                      {product.name} {product.sku ? `(${product.sku})` : ''}
                    </option>
                  ))}
                </select>
              )}
              {finishedProducts.length === 0 && !finishedProductsLoading && (
                <p className="text-xs text-amber-600 mt-1">⚠️ No finished products found. Please add finished products first.</p>
              )}
            </div>

            {/* Revision / Version */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Revision / Version *
              </label>
              <input
                type="text"
                value={bomForm.revision_code}
                onChange={(e) => setBomForm({ ...bomForm, revision_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., v1.0, v2.0"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Version identifier for this BOM</p>
            </div>

            {/* Variant */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Variant *
              </label>
              {bomFormVariantsLoading ? (
                <div className="text-sm text-gray-500">Loading variants...</div>
              ) : (
                <select
                  value={bomForm.variant_id}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    const selected = bomFormVariants.find((v: any) => String(v.variant_id) === String(nextId));
                    setBomForm((prev) => ({
                      ...prev,
                      variant_id: nextId,
                      // auto-fill unit from variant if available; keep user's selection if they already set one
                      unit_id: selected?.unit_id != null ? String(selected.unit_id) : prev.unit_id,
                    }));
                  }}
                  disabled={!bomForm.product_id || !!editingBom}
                  required
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    !bomForm.product_id ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="">
                    {!bomForm.product_id ? "Select a finished product first" : "Select a variant"}
                  </option>
                  {bomFormVariants.map((v: any) => (
                    <option key={v.variant_id} value={v.variant_id}>
                      {v.variant_name || v.name || "Variant"} {v.variant_sku || v.sku ? `(${v.variant_sku || v.sku})` : ''}
                    </option>
                  ))}
                </select>
              )}
              {bomForm.product_id && !bomFormVariantsLoading && bomFormVariants.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">⚠️ No variants found for this product. Please add variants first.</p>
              )}
            </div>

            {/* Unit of Measure */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Unit of Measure *
              </label>
              {unitsLoading ? (
                <div className="text-sm text-gray-500">Loading units...</div>
              ) : (
                <select
                  value={bomForm.unit_id}
                  onChange={(e) => setBomForm({ ...bomForm, unit_id: e.target.value })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    !bomForm.product_id 
                      ? 'bg-gray-100 cursor-not-allowed' 
                      : ''
                  }`}
                  required
                  disabled={!bomForm.product_id}
                >
                  <option value="">
                    {!bomForm.product_id 
                      ? "Select a finished product first" 
                      : "Select unit of measure"}
                  </option>
                  {units.map((unit: any) => (
                    <option key={unit.unit_id} value={unit.unit_id}>
                      {unit.name || unit.unit_name} {unit.symbol || unit.abbreviation ? `(${unit.symbol || unit.abbreviation})` : ''}
                    </option>
                  ))}
                </select>
              )}
              {!bomForm.product_id && (
                <p className="text-xs text-gray-500 mt-1">Please select a finished product first</p>
              )}
              {bomForm.product_id && bomForm.variant_id && bomForm.unit_id && (
                <p className="text-xs text-green-600 mt-1">✓ Unit pre-filled from selected variant (you can change it)</p>
              )}
              {bomForm.product_id && !bomForm.unit_id && !unitsLoading && (
                <p className="text-xs text-amber-600 mt-1">⚠️ Selected product has no unit assigned</p>
              )}
              {units.length === 0 && !unitsLoading && (
                <p className="text-xs text-amber-600 mt-1">⚠️ No units found. Please add units first.</p>
              )}
            </div>

            {/* Effective From */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Effective From *
              </label>
              <input
                type="date"
                value={bomForm.effective_from}
                onChange={(e) => setBomForm({ ...bomForm, effective_from: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Date when this BOM becomes valid</p>
            </div>

            {/* Effective To */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Effective To <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="date"
                value={bomForm.effective_to}
                onChange={(e) => setBomForm({ ...bomForm, effective_to: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={bomForm.effective_from || undefined}
              />
              <p className="text-xs text-gray-500 mt-1">Optional date when this BOM expires</p>
            </div>

            {/* Description / Notes */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Description / Notes <span className="text-gray-400">(Optional)</span>
              </label>
              <textarea
                value={bomForm.notes}
                onChange={(e) => setBomForm({ ...bomForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Internal instructions or notes about this BOM"
              />
              <p className="text-xs text-gray-500 mt-1">Free text for internal instructions or notes</p>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => {
                  setShowAddBomForm(false);
                  setBomForm({
                    bom_code: '',
                    product_id: '',
                    revision_code: '',
                    unit_id: '',
                    effective_from: '',
                    effective_to: '',
                    notes: ''
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={submittingBom}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitBom}
                disabled={submittingBom || !bomForm.bom_code || !bomForm.product_id || !bomForm.revision_code || !bomForm.unit_id || !bomForm.effective_from}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submittingBom ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2 inline" />
                    {editingBom ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {editingBom ? 'Update BOM' : 'Create BOM'}
                  </>
                )}
              </button>
            </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
    );
  };

  // Render Quality Control
  const renderQuality = () => {
    if (qcLoading) {
      return (
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      );
    }

    return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quality Control</h2>
          <p className="text-sm text-gray-600 mt-1">Manage quality inspections and approvals</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Inspection
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingQC.filter(q => q.status === 'pending').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Failed</p>
          <p className="text-2xl font-bold text-red-600">{pendingQC.filter(q => q.status === 'failed').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Passed</p>
          <p className="text-2xl font-bold text-green-600">{pendingQC.filter(q => q.status === 'passed').length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-900">Quality Inspections</h3>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">✓ Approve Selected</button>
            <button className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">✗ Reject Selected</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Batch #</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Product</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Quantity</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Issue</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Age</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingQC.map(qc => (
                <tr key={qc.batch} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">{qc.batch}</td>
                  <td className="px-4 py-3 text-sm">{qc.product}</td>
                  <td className="px-4 py-3 text-sm font-semibold">{qc.qty}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      qc.status === 'failed' ? 'bg-red-100 text-red-800' :
                      qc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {qc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-red-600">{qc.issue || '-'}</td>
                  <td className="px-4 py-3 text-sm">{qc.age}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-green-600 hover:underline text-sm mr-2">✓</button>
                    <button className="text-red-600 hover:underline text-sm mr-2">✗</button>
                    <button className="text-blue-600 hover:underline text-sm">
                      <Eye className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    );
  };

  // Render Raw Materials
  const renderMaterials = () => {
    return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Raw Materials & Tools</h2>
          <p className="text-sm text-gray-600 mt-1">Manage raw materials and production tools</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setMaterialsTab('materials')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            materialsTab === 'materials'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Package className="w-4 h-4 inline mr-2" />
          Raw Materials
        </button>
        <button
          onClick={() => setMaterialsTab('tools')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            materialsTab === 'tools'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Wrench className="w-4 h-4 inline mr-2" />
          Tools
        </button>
        <button
          onClick={() => setMaterialsTab('categories')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            materialsTab === 'categories'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <ClipboardList className="w-4 h-4 inline mr-2" />
          Tool Categories
        </button>
      </div>

      {/* Raw Materials Tab */}
      {materialsTab === 'materials' && (
        <>
          {rawMaterialsLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Raw Materials</h3>
                  <p className="text-sm text-gray-600 mt-1">Monitor raw material inventory levels</p>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Request Materials
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-600">Critical</p>
                  <p className="text-2xl font-bold text-red-600">{rawMaterials.filter(m => m.status === 'critical').length}</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-600">Low Stock</p>
                  <p className="text-2xl font-bold text-orange-600">{rawMaterials.filter(m => m.status === 'low').length}</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-600">Sufficient</p>
                  <p className="text-2xl font-bold text-green-600">{rawMaterials.filter(m => m.status === 'sufficient').length}</p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">SKU</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Material Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Current Stock</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Required</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Orders Affected</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rawMaterials.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                            <div className="flex flex-col items-center gap-2">
                              <Package className="h-10 w-10 text-gray-400" />
                              <p className="text-sm font-medium">No raw materials found</p>
                              <p className="text-xs">Add raw materials to your product catalog to see them here</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        rawMaterials.map((mat, index) => (
                          <tr key={mat.sku || `raw-material-${index}`} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-sm">{mat.sku || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm font-medium">{mat.name || 'Unnamed Material'}</td>
                            <td className="px-4 py-3 text-sm font-semibold">{mat.current?.toLocaleString() || '0'}</td>
                            <td className="px-4 py-3 text-sm">{mat.required?.toLocaleString() || '0'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                mat.status === 'critical' ? 'bg-red-100 text-red-800' :
                                mat.status === 'low' ? 'bg-orange-100 text-orange-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {mat.status || 'sufficient'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">{mat.ordersAffected || 0} orders</td>
                            <td className="px-4 py-3 text-right">
                              <button className="text-blue-600 hover:underline text-sm">Request</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Tools Tab */}
      {materialsTab === 'tools' && (
        <>
          {toolsError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {toolsError}
            </div>
          )}
          {toolFormSuccess && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {toolFormSuccess}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">Tools</h3>
            <button
              onClick={async () => {
                setShowToolForm(true);
                setEditingTool(null);
                setToolFormData({
                  tool_name: "",
                  tool_code: "",
                  category_id: "",
                  location_id: "",
                });
                setToolFormError(null);
                setToolFormSuccess(null);
                // Fetch locations from database when opening Add Tool form
                setLocationsLoading(true);
                try {
                  const locationsRes = await api.get<any[]>(`/inventory/locations${user?.company_id ? `?companyId=${user.company_id}` : ''}`);
                  if (locationsRes.data && Array.isArray(locationsRes.data)) {
                    setLocations(locationsRes.data);
                  }
                } catch {
                  setLocations([]);
                } finally {
                  setLocationsLoading(false);
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Tool
            </button>
          </div>

          {showToolForm && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                {editingTool ? "Edit Tool" : "Create New Tool"}
              </h4>
              <form onSubmit={handleToolSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Tool Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Hammer, Drill, Measuring Tape"
                    value={toolFormData.tool_name}
                    onChange={(e) => {
                      const toolName = e.target.value;
                      // Auto-generate short tool code from tool name (acronym style)
                      const words = toolName.trim().split(/\s+/).filter(w => w.length > 0);
                      let autoCode = '';
                      if (words.length > 1) {
                        // Multiple words: take first letter of each word (acronym)
                        autoCode = words
                          .map(word => word.charAt(0).toUpperCase())
                          .join('')
                          .substring(0, 5); // Max 5 characters for acronyms
                      } else if (words.length === 1) {
                        // Single word: take first 4 characters
                        autoCode = words[0]
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, '')
                          .substring(0, 4);
                      }
                      setToolFormData({ 
                        ...toolFormData, 
                        tool_name: toolName,
                        tool_code: autoCode 
                      });
                    }}
                    onBlur={(e) => {
                      // Ensure code is generated when user finishes typing
                      if (toolFormData.tool_name && !toolFormData.tool_code) {
                        const words = toolFormData.tool_name.trim().split(/\s+/).filter(w => w.length > 0);
                        let autoCode = '';
                        if (words.length > 1) {
                          autoCode = words
                            .map(word => word.charAt(0).toUpperCase())
                            .join('')
                            .substring(0, 5);
                        } else if (words.length === 1) {
                          autoCode = words[0]
                            .toUpperCase()
                            .replace(/[^A-Z0-9]/g, '')
                            .substring(0, 4);
                        }
                        setToolFormData({ 
                          ...toolFormData, 
                          tool_code: autoCode 
                        });
                      }
                    }}
                    disabled={toolSubmitting}
                    required
                    maxLength={150}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500">Maximum 150 characters</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Tool Code</label>
                  <input
                    type="text"
                    placeholder="Auto-generated from tool name"
                    value={toolFormData.tool_code}
                    onChange={(e) =>
                      setToolFormData({ ...toolFormData, tool_code: e.target.value.toUpperCase() })
                    }
                    disabled={toolSubmitting}
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500">
                    Auto-generated from tool name. You can edit if needed. Maximum 50 characters.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Category *</label>
                  <select
                    value={toolFormData.category_id}
                    onChange={(e) =>
                      setToolFormData({ ...toolFormData, category_id: e.target.value })
                    }
                    disabled={toolSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a category</option>
                    {toolCategories.map((category) => (
                      <option key={category.category_id} value={category.category_id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {toolCategories.length === 0 && (
                    <p className="text-xs text-amber-600">
                      No categories available. Please create tool categories first.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <select
                    value={toolFormData.location_id}
                    onChange={(e) =>
                      setToolFormData({ ...toolFormData, location_id: e.target.value })
                    }
                    disabled={toolSubmitting || locationsLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a location</option>
                    {locationsLoading ? (
                      <option value="" disabled>Loading locations from database...</option>
                    ) : (
                      locations
                        .filter((loc: any) => loc.is_active !== 0 && loc.is_active !== false)
                        .map((loc: any) => (
                          <option key={loc.location_id} value={loc.location_id}>
                            {loc.name} {loc.code ? `(${loc.code})` : ''}
                          </option>
                        ))
                    )}
                  </select>
                  {!locationsLoading && locations.length === 0 && (
                    <p className="text-xs text-amber-600">
                      No locations available. Create locations in Operations first, or refresh when opening this form.
                    </p>
                  )}
                </div>

                {toolFormError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    {toolFormError}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowToolForm(false);
                      setEditingTool(null);
                      setToolFormData({
                        tool_name: "",
                        tool_code: "",
                        category_id: "",
                        location_id: "",
                      });
                      setToolFormError(null);
                      setToolFormSuccess(null);
                    }}
                    disabled={toolSubmitting}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={toolSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {toolSubmitting ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2 inline" />
                        Saving...
                      </>
                    ) : editingTool ? (
                      "Update Tool"
                    ) : (
                      "Create Tool"
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {toolsLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {toolsError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg m-4">
                  <p className="text-sm text-red-800">Error loading tools: {toolsError}</p>
                </div>
              )}
              {tools.length === 0 && !toolsLoading ? (
                <div className="p-8 text-center text-gray-500">
                  <Wrench className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No tools found. Click "Add Tool" to create one.</p>
                  {toolsError && (
                    <p className="text-xs text-red-600 mt-2">Error: {toolsError}</p>
                  )}
                </div>
              ) : tools.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tools.map((tool) => {
                        const category = toolCategories.find(c => c.category_id === tool.category_id);
                        return (
                          <tr key={tool.tool_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{tool.tool_name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {tool.tool_code || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {category?.name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {tool.location || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleToolEdit(tool)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                {tool.tool_id && (
                                  <button
                                    onClick={() => handleToolDelete(tool.tool_id!)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}

      {/* Tool Categories Tab */}
      {materialsTab === 'categories' && (
        <>
          {categoryFormSuccess && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {categoryFormSuccess}
              </div>
            </div>
          )}
          {categoryFormError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 mb-4">
              {categoryFormError}
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Tool Categories</h3>
            <button
              onClick={() => {
                setShowCategoryForm(true);
                setEditingCategory(null);
                setCategoryFormData({
                  name: "",
                  description: "",
                });
                setCategoryFormError(null);
                setCategoryFormSuccess(null);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>

          {showCategoryForm && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                {editingCategory ? "Edit Category" : "Create New Category"}
              </h4>
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Category Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Hand Tools, Power Tools, Measuring Tools"
                    value={categoryFormData.name}
                    onChange={(e) =>
                      setCategoryFormData({ ...categoryFormData, name: e.target.value })
                    }
                    disabled={categorySubmitting}
                    required
                    maxLength={100}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500">Maximum 100 characters</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    placeholder="Optional description for this category"
                    value={categoryFormData.description}
                    onChange={(e) =>
                      setCategoryFormData({ ...categoryFormData, description: e.target.value })
                    }
                    disabled={categorySubmitting}
                    maxLength={500}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500">Maximum 500 characters</p>
                </div>

                {categoryFormError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    {categoryFormError}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategoryForm(false);
                      setEditingCategory(null);
                      setCategoryFormData({
                        name: "",
                        description: "",
                      });
                      setCategoryFormError(null);
                      setCategoryFormSuccess(null);
                    }}
                    disabled={categorySubmitting}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={categorySubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {categorySubmitting ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2 inline" />
                        Saving...
                      </>
                    ) : (
                      editingCategory ? "Update Category" : "Create Category"
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {categoriesLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Category Name</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {toolCategories.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-6 py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <ClipboardList className="h-10 w-10 text-gray-400" />
                            <p className="text-sm font-medium">No categories found</p>
                            <p className="text-xs">Add a category to get started</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      toolCategories.map((category) => (
                        <tr key={category.category_id} className="border-b hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {category.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingCategory(category);
                                  setCategoryFormData({
                                    name: category.name,
                                    description: category.description || "",
                                  });
                                  setShowCategoryForm(true);
                                  setCategoryFormError(null);
                                  setCategoryFormSuccess(null);
                                }}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {category.category_id && (
                                <button
                                  onClick={() => handleCategoryDelete(category.category_id!)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
    );
  };

  // Handle submit new material request
  const handleSubmitMaterialRequest = async () => {
    if (!materialRequestForm.product_id || !materialRequestForm.quantity_requested) {
      setErrorMessage("Please fill in all required fields");
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    setSubmittingMaterialRequest(true);
    try {
      const response = await api.post("/production/material-requests", {
        product_id: materialRequestForm.product_id,
        quantity_requested: materialRequestForm.quantity_requested,
        unit_id: materialRequestForm.unit_id || null,
        priority: materialRequestForm.priority,
        notes: materialRequestForm.notes || null
      });

      if (response.error) {
        setErrorMessage(response.error || "Failed to create material request");
        setTimeout(() => setErrorMessage(null), 5000);
      } else {
        setSuccessMessage("Material request created successfully!");
        setTimeout(() => setSuccessMessage(null), 5000);
        setShowNewMaterialRequestForm(false);
        setMaterialRequestForm({
          product_id: '',
          quantity_requested: '',
          unit_id: '',
          priority: 'normal',
          notes: ''
        });
        // Refresh material requests list
        const refreshResponse = await api.get<MaterialRequest[]>("/production/material-requests");
        if (refreshResponse.data) {
          const data = refreshResponse.data;
          setMaterialRequests(Array.isArray(data) ? data : []);
        }
      }
    } catch (error) {
      console.error("Error creating material request:", error);
      setErrorMessage("Failed to create material request");
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setSubmittingMaterialRequest(false);
    }
  };

  // Render Material Requests
  const renderMaterialRequests = () => {
    if (materialRequestsLoading) {
      return (
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      );
    }

    return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Material Requests</h2>
          <p className="text-sm text-gray-600 mt-1">Track material requests and approvals</p>
        </div>
        <button 
          onClick={() => setShowNewMaterialRequestForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{safeMaterialRequests.filter(r => r.status === 'pending').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Approved</p>
          <p className="text-2xl font-bold text-green-600">{safeMaterialRequests.filter(r => r.status === 'approved').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Fulfilled</p>
          <p className="text-2xl font-bold text-blue-600">{safeMaterialRequests.filter(r => r.status === 'fulfilled').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Rejected</p>
          <p className="text-2xl font-bold text-red-600">{safeMaterialRequests.filter(r => r.status === 'rejected').length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Request #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Material</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Requested Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {safeMaterialRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-10 w-10 text-gray-400" />
                      <p className="text-sm font-medium">No material requests found</p>
                      <p className="text-xs">Create a new request to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                safeMaterialRequests.map((req, index) => (
                  <tr key={req.id || `material-request-${index}`} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm font-semibold">{req.requestNumber || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm font-medium">{req.material || 'Unknown Material'}</td>
                    <td className="px-4 py-3 font-mono text-sm">{req.sku || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">{req.quantity?.toLocaleString() || '0'} {req.unit || 'units'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                        req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        req.status === 'approved' ? 'bg-green-100 text-green-800' :
                        req.status === 'fulfilled' ? 'bg-blue-100 text-blue-800' :
                        req.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {req.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                        req.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        req.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        req.priority === 'low' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {req.priority || 'normal'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{req.requestedDate || 'N/A'}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-blue-600 hover:underline text-sm">View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Material Request Form Modal */}
      {showNewMaterialRequestForm && (
        <Modal
          open={showNewMaterialRequestForm}
          onClose={() => {
            setShowNewMaterialRequestForm(false);
            setMaterialRequestForm({
              product_id: '',
              quantity_requested: '',
              unit_id: '',
              priority: 'normal',
              notes: ''
            });
          }}
          title="New Material Request"
        >
          <div className="space-y-4">
            {/* Material Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Raw Material *
              </label>
              {materialRequestFormProductsLoading ? (
                <div className="text-sm text-gray-500">Loading materials...</div>
              ) : (
                <select
                  value={materialRequestForm.product_id}
                  onChange={(e) => {
                    const selectedProduct = materialRequestFormProducts.find((p: any) => p.product_id === parseInt(e.target.value));
                    setMaterialRequestForm({
                      ...materialRequestForm,
                      product_id: e.target.value,
                      unit_id: selectedProduct?.unit_id ? String(selectedProduct.unit_id) : ''
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a raw material</option>
                  {materialRequestFormProducts.map((product: any) => (
                    <option key={product.product_id} value={product.product_id}>
                      {product.name} {product.sku ? `(${product.sku})` : ''}
                    </option>
                  ))}
                </select>
              )}
              {materialRequestFormProducts.length === 0 && !materialRequestFormProductsLoading && (
                <p className="text-xs text-amber-600 mt-1">⚠️ No raw materials found. Please add raw materials first.</p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity Requested *
              </label>
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                value={materialRequestForm.quantity_requested}
                onChange={(e) => setMaterialRequestForm({ ...materialRequestForm, quantity_requested: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.0000"
                required
              />
            </div>

            {/* Unit of Measure */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit of Measure
              </label>
              {materialRequestFormUnitsLoading ? (
                <div className="text-sm text-gray-500">Loading units...</div>
              ) : (
                <select
                  value={materialRequestForm.unit_id}
                  onChange={(e) => setMaterialRequestForm({ ...materialRequestForm, unit_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a unit (optional)</option>
                  {materialRequestFormUnits.map((unit: any) => (
                    <option key={unit.unit_id} value={unit.unit_id}>
                      {unit.name} {unit.symbol ? `(${unit.symbol})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority *
              </label>
              <select
                value={materialRequestForm.priority}
                onChange={(e) => setMaterialRequestForm({ ...materialRequestForm, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes <span className="text-gray-400">(Optional)</span>
              </label>
              <textarea
                value={materialRequestForm.notes}
                onChange={(e) => setMaterialRequestForm({ ...materialRequestForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Add any additional notes or requirements..."
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => {
                  setShowNewMaterialRequestForm(false);
                  setMaterialRequestForm({
                    product_id: '',
                    quantity_requested: '',
                    unit_id: '',
                    priority: 'normal',
                    notes: ''
                  });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={submittingMaterialRequest}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitMaterialRequest}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={submittingMaterialRequest}
              >
                {submittingMaterialRequest ? 'Creating...' : 'Create Request'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
    );
  };

  // Render Worker Assignments
  const renderWorkerAssignments = () => (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Worker Assignments</h2>
          <p className="text-sm text-gray-600 mt-1">Manage worker assignments and schedules</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Assign Worker
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-2xl font-bold text-green-600">{workerAssignments.filter(w => w.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">On Break</p>
          <p className="text-2xl font-bold text-yellow-600">{workerAssignments.filter(w => w.status === 'on_break').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Off Duty</p>
          <p className="text-2xl font-bold text-gray-600">{workerAssignments.filter(w => w.status === 'off_duty').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Workers</p>
          <p className="text-2xl font-bold text-blue-600">{workerAssignments.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Worker Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Assigned To</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Shift</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tasks Completed</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Efficiency</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workerAssignments.map(worker => (
                <tr key={worker.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{worker.workerName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{worker.role}</td>
                  <td className="px-4 py-3 text-sm">{worker.assignedTo}</td>
                  <td className="px-4 py-3 text-sm">{worker.shift}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      worker.status === 'active' ? 'bg-green-100 text-green-800' :
                      worker.status === 'on_break' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {worker.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold">{worker.tasksCompleted}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-semibold ${
                      worker.efficiency >= 90 ? 'text-green-600' :
                      worker.efficiency >= 75 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {worker.efficiency}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-blue-600 hover:underline text-sm">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Render Production Schedule
  const renderProductionSchedule = () => (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Production Schedule</h2>
          <p className="text-sm text-gray-600 mt-1">View and manage production schedules</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Schedule Order
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Scheduled</p>
          <p className="text-2xl font-bold text-blue-600">{productionSchedule.filter(s => s.status === 'scheduled').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">In Progress</p>
          <p className="text-2xl font-bold text-green-600">{productionSchedule.filter(s => s.status === 'in_progress').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Completed</p>
          <p className="text-2xl font-bold text-gray-600">{productionSchedule.filter(s => s.status === 'completed').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Delayed</p>
          <p className="text-2xl font-bold text-red-600">{productionSchedule.filter(s => s.status === 'delayed').length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Order #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Start Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">End Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Workstation</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Workers</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {productionSchedule.map(schedule => (
                <tr key={schedule.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm font-semibold">{schedule.orderNumber}</td>
                  <td className="px-4 py-3 text-sm">{schedule.product}</td>
                  <td className="px-4 py-3 text-sm">{new Date(schedule.startTime).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">{new Date(schedule.endTime).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">{schedule.duration}</td>
                  <td className="px-4 py-3 text-sm font-medium">{schedule.workstation}</td>
                  <td className="px-4 py-3 text-sm">{schedule.assignedWorkers}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      schedule.status === 'in_progress' ? 'bg-green-100 text-green-800' :
                      schedule.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      schedule.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {schedule.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-blue-600 hover:underline text-sm">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Render Equipment Maintenance
  const renderEquipmentMaintenance = () => (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Equipment Maintenance</h2>
          <p className="text-sm text-gray-600 mt-1">Track equipment maintenance schedules and status</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Schedule Maintenance
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Operational</p>
          <p className="text-2xl font-bold text-green-600">{equipmentMaintenance.filter(e => e.status === 'operational').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Maintenance Due</p>
          <p className="text-2xl font-bold text-yellow-600">{equipmentMaintenance.filter(e => e.status === 'maintenance_due').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Under Maintenance</p>
          <p className="text-2xl font-bold text-orange-600">{equipmentMaintenance.filter(e => e.status === 'under_maintenance').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Broken</p>
          <p className="text-2xl font-bold text-red-600">{equipmentMaintenance.filter(e => e.status === 'broken').length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Equipment</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Last Maintenance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Next Maintenance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Technician</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {equipmentMaintenance.map(equipment => (
                <tr key={equipment.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{equipment.equipmentName}</td>
                  <td className="px-4 py-3 font-mono text-sm">{equipment.equipmentCode}</td>
                  <td className="px-4 py-3 text-sm">{equipment.location}</td>
                  <td className="px-4 py-3 text-sm">{equipment.lastMaintenance}</td>
                  <td className="px-4 py-3 text-sm font-semibold">{equipment.nextMaintenance}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      equipment.status === 'operational' ? 'bg-green-100 text-green-800' :
                      equipment.status === 'maintenance_due' ? 'bg-yellow-100 text-yellow-800' :
                      equipment.status === 'under_maintenance' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {equipment.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{equipment.maintenanceType}</td>
                  <td className="px-4 py-3 text-sm">{equipment.assignedTechnician}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-blue-600 hover:underline text-sm">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Render Production Reports
  const renderProductionReports = () => (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Production Reports</h2>
        <p className="text-sm text-gray-600 mt-1">View detailed production reports and analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Daily Production Report</h3>
          <p className="text-sm text-gray-600 mb-4">View today's production summary</p>
          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            Generate Report
          </button>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Weekly Production Report</h3>
          <p className="text-sm text-gray-600 mb-4">View this week's production summary</p>
          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            Generate Report
          </button>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Monthly Production Report</h3>
          <p className="text-sm text-gray-600 mb-4">View this month's production summary</p>
          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            Generate Report
          </button>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Quality Control Report</h3>
          <p className="text-sm text-gray-600 mb-4">View quality inspection reports</p>
          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            Generate Report
          </button>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Material Usage Report</h3>
          <p className="text-sm text-gray-600 mb-4">View raw material consumption</p>
          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            Generate Report
          </button>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Worker Performance Report</h3>
          <p className="text-sm text-gray-600 mb-4">View worker productivity metrics</p>
          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );

  // Render Efficiency Analysis
  const renderEfficiencyAnalysis = () => (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Efficiency Analysis</h2>
        <p className="text-sm text-gray-600 mt-1">Analyze production efficiency and performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-2">Overall Efficiency</p>
          <p className="text-3xl font-bold text-green-600">{stats.efficiencyRate}%</p>
          <p className="text-xs text-gray-500 mt-2">Target: 90%</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-2">Defect Rate</p>
          <p className="text-3xl font-bold text-red-600">{stats.defectRate}%</p>
          <p className="text-xs text-gray-500 mt-2">Target: &lt;2%</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-2">Production Rate</p>
          <p className="text-3xl font-bold text-blue-600">
            {Math.round((stats.todayProduction / stats.targetProduction) * 100)}%
          </p>
          <p className="text-xs text-gray-500 mt-2">vs Target</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Efficiency Trends</h3>
        <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500">Efficiency chart will be displayed here</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Line Performance</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Line A</span>
              <span className="font-semibold text-green-600">95%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '95%' }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Line B</span>
              <span className="font-semibold text-yellow-600">78%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '78%' }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Line C</span>
              <span className="font-semibold text-green-600">88%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '88%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Cost Analysis
  const renderCostAnalysis = () => (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Cost Analysis</h2>
        <p className="text-sm text-gray-600 mt-1">Analyze production costs and expenses</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-2">Material Costs</p>
          <p className="text-2xl font-bold text-gray-900">RWF 2,450,000</p>
          <p className="text-xs text-gray-500 mt-2">This month</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-2">Labor Costs</p>
          <p className="text-2xl font-bold text-gray-900">RWF 1,200,000</p>
          <p className="text-xs text-gray-500 mt-2">This month</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-2">Overhead Costs</p>
          <p className="text-2xl font-bold text-gray-900">RWF 350,000</p>
          <p className="text-xs text-gray-500 mt-2">This month</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-2">Total Costs</p>
          <p className="text-2xl font-bold text-blue-600">RWF 4,000,000</p>
          <p className="text-xs text-gray-500 mt-2">This month</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
        <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500">Cost breakdown chart will be displayed here</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Cost by Product</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Material Cost</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Labor Cost</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Overhead</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Total Cost</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Units Produced</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Cost per Unit</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">Strawberry Yogurt 500ml</td>
                <td className="px-4 py-3 text-sm">RWF 850,000</td>
                <td className="px-4 py-3 text-sm">RWF 420,000</td>
                <td className="px-4 py-3 text-sm">RWF 120,000</td>
                <td className="px-4 py-3 text-sm font-semibold">RWF 1,390,000</td>
                <td className="px-4 py-3 text-sm">1,000 units</td>
                <td className="px-4 py-3 text-sm font-semibold">RWF 1,390</td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">Orange Juice 1L</td>
                <td className="px-4 py-3 text-sm">RWF 600,000</td>
                <td className="px-4 py-3 text-sm">RWF 300,000</td>
                <td className="px-4 py-3 text-sm">RWF 90,000</td>
                <td className="px-4 py-3 text-sm font-semibold">RWF 990,000</td>
                <td className="px-4 py-3 text-sm">500 units</td>
                <td className="px-4 py-3 text-sm font-semibold">RWF 1,980</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Render My Schedule
  const renderMySchedule = () => {
    // Sample schedule data
    interface ScheduleItem {
      id: number;
      title: string;
      type: 'meeting' | 'inspection' | 'maintenance' | 'training' | 'review' | 'other';
      startTime: string;
      endTime: string;
      date: string;
      location: string;
      description: string;
      status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
      priority: 'high' | 'medium' | 'low';
    }

    const scheduleItems: ScheduleItem[] = [
      {
        id: 1,
        title: 'Daily Production Review Meeting',
        type: 'meeting',
        startTime: '08:00',
        endTime: '09:00',
        date: '2025-12-08',
        location: 'Conference Room A',
        description: 'Review yesterday\'s production metrics and plan today\'s activities',
        status: 'completed',
        priority: 'high'
      },
      {
        id: 2,
        title: 'Quality Control Inspection - Line A',
        type: 'inspection',
        startTime: '10:00',
        endTime: '11:00',
        date: '2025-12-08',
        location: 'Line A',
        description: 'Routine QC inspection for Strawberry Yogurt batch',
        status: 'in_progress',
        priority: 'high'
      },
      {
        id: 3,
        title: 'Equipment Maintenance - Line B Mixer',
        type: 'maintenance',
        startTime: '14:00',
        endTime: '16:00',
        date: '2025-12-08',
        location: 'Line B',
        description: 'Scheduled maintenance for Line B mixer',
        status: 'upcoming',
        priority: 'medium'
      },
      {
        id: 4,
        title: 'Worker Training Session',
        type: 'training',
        startTime: '15:00',
        endTime: '17:00',
        date: '2025-12-09',
        location: 'Training Room',
        description: 'Safety protocols and new production procedures',
        status: 'upcoming',
        priority: 'medium'
      },
      {
        id: 5,
        title: 'Monthly Production Review',
        type: 'review',
        startTime: '09:00',
        endTime: '11:00',
        date: '2025-12-10',
        location: 'Conference Room B',
        description: 'Monthly production performance review with management',
        status: 'upcoming',
        priority: 'high'
      },
      {
        id: 6,
        title: 'Raw Material Inventory Check',
        type: 'inspection',
        startTime: '13:00',
        endTime: '14:00',
        date: '2025-12-08',
        location: 'Warehouse',
        description: 'Weekly inventory check for critical raw materials',
        status: 'upcoming',
        priority: 'medium'
      }
    ];

    const today = new Date().toISOString().split('T')[0];
    const todayItems = scheduleItems.filter(item => item.date === today);
    const upcomingItems = scheduleItems.filter(item => item.date > today).slice(0, 5);
    const pastItems = scheduleItems.filter(item => item.date < today).slice(-3);

    const getTypeColor = (type: string) => {
      switch (type) {
        case 'meeting': return 'bg-blue-100 text-blue-800';
        case 'inspection': return 'bg-green-100 text-green-800';
        case 'maintenance': return 'bg-orange-100 text-orange-800';
        case 'training': return 'bg-purple-100 text-purple-800';
        case 'review': return 'bg-indigo-100 text-indigo-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'completed': return 'bg-gray-100 text-gray-800';
        case 'in_progress': return 'bg-green-100 text-green-800';
        case 'upcoming': return 'bg-blue-100 text-blue-800';
        case 'cancelled': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'high': return 'text-red-600';
        case 'medium': return 'text-yellow-600';
        case 'low': return 'text-green-600';
        default: return 'text-gray-600';
      }
    };

    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Schedule</h2>
            <p className="text-sm text-gray-600 mt-1">View and manage your daily schedule and appointments</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Calendar View
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Event
            </button>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Today's Schedule ({new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })})
            </h3>
            <span className="text-sm text-gray-600">{todayItems.length} items</span>
          </div>
          
          {todayItems.length > 0 ? (
            <div className="space-y-3">
              {todayItems.map(item => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(item.type)}`}>
                          {item.type}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                        <span className={`text-xs font-semibold ${getPriorityColor(item.priority)}`}>
                          {item.priority.toUpperCase()} PRIORITY
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {item.startTime} - {item.endTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {item.location}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                        Edit
                      </button>
                      <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No scheduled items for today</p>
            </div>
          )}
        </div>

        {/* Upcoming Schedule */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Schedule</h3>
          
          {upcomingItems.length > 0 ? (
            <div className="space-y-3">
              {upcomingItems.map(item => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(item.type)}`}>
                          {item.type}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {item.startTime} - {item.endTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {item.location}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                        Edit
                      </button>
                      <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No upcoming scheduled items</p>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Today's Events</p>
            <p className="text-2xl font-bold text-gray-900">{todayItems.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Upcoming This Week</p>
            <p className="text-2xl font-bold text-blue-600">{upcomingItems.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Completed</p>
            <p className="text-2xl font-bold text-green-600">{scheduleItems.filter(i => i.status === 'completed').length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">High Priority</p>
            <p className="text-2xl font-bold text-red-600">{scheduleItems.filter(i => i.priority === 'high').length}</p>
          </div>
        </div>

        {/* Schedule Calendar View (Simplified) */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Overview</h3>
          <div className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
              const dayDate = new Date();
              dayDate.setDate(dayDate.getDate() - dayDate.getDay() + 1 + index);
              const dayStr = dayDate.toISOString().split('T')[0];
              const dayItems = scheduleItems.filter(item => item.date === dayStr);
              
              return (
                <div key={day} className="border border-gray-200 rounded-lg p-2 min-h-[100px]">
                  <div className="text-xs font-semibold text-gray-600 mb-1">{day}</div>
                  <div className="text-xs text-gray-500 mb-2">{dayDate.getDate()}</div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 2).map(item => (
                      <div
                        key={item.id}
                        className={`text-xs p-1 rounded ${getTypeColor(item.type)} truncate`}
                        title={item.title}
                      >
                        {item.startTime} {item.title.substring(0, 15)}...
                      </div>
                    ))}
                    {dayItems.length > 2 && (
                      <div className="text-xs text-gray-500">+{dayItems.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboard();
      case 'my-schedule':
        return renderMySchedule();
      case 'orders':
        return renderProductionOrders();
      case 'wip':
        return renderWIP();
      case 'bom':
        return renderBOM();
      case 'quality':
        return renderQuality();
      case 'materials':
        return renderMaterials();
      case 'material-requests':
        return renderMaterialRequests();
      case 'worker-assignments':
        return renderWorkerAssignments();
      case 'production-schedule':
        return renderProductionSchedule();
      case 'equipment-maintenance':
        return renderEquipmentMaintenance();
      case 'production-reports':
        return renderProductionReports();
      case 'efficiency-analysis':
        return renderEfficiencyAnalysis();
      case 'cost-analysis':
        return renderCostAnalysis();
      case 'profile':
        return renderProfile();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 relative">
      {/* Success/Error Notifications - Fixed position, always visible */}
      {successMessage && (
        <div 
          className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-top-5 fade-in"
          style={{ animation: 'slideIn 0.3s ease-out' }}
        >
          <div className="bg-green-500 border-2 border-green-600 rounded-lg shadow-2xl p-4 min-w-[320px] max-w-md">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white mb-1">Success!</h3>
                <p className="text-sm text-white/95">{successMessage}</p>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="flex-shrink-0 text-white hover:text-white/80 transition-colors"
                aria-label="Close notification"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
      {errorMessage && (
        <div 
          className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-top-5 fade-in"
          style={{ animation: 'slideIn 0.3s ease-out' }}
        >
          <div className="bg-red-500 border-2 border-red-600 rounded-lg shadow-2xl p-4 min-w-[320px] max-w-md">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <XCircle className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white mb-1">Error</h3>
                <p className="text-sm text-white/95">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="flex-shrink-0 text-white hover:text-white/80 transition-colors"
                aria-label="Close notification"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Company Header */}
        <div className="p-4 border-b">
          <h2 className="font-bold text-gray-900">Masaka HQ</h2>
          <p className="text-sm text-gray-600">Kigali, RW</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          {/* Core Section */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Core</p>
            <button
              onClick={() => setActiveSection('dashboard')}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 ${
                activeSection === 'dashboard' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Production Dashboard
            </button>
            <button
              onClick={() => setActiveSection('my-schedule')}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 ${
                activeSection === 'my-schedule' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              My Schedule
            </button>
            <button
              onClick={() => setActiveSection('profile')}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 ${
                activeSection === 'profile' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Profile
            </button>
          </div>

          {/* Production Management */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Production Management</p>
            <button
              onClick={() => setActiveSection('orders')}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 ${
                activeSection === 'orders' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Production Orders
            </button>
            <button
              onClick={() => setActiveSection('wip')}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 ${
                activeSection === 'wip' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Work-In-Progress
            </button>
            <button
              onClick={() => setActiveSection('bom')}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 ${
                activeSection === 'bom' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Bill of Materials
            </button>
          </div>

          {/* Quality & Materials */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Quality & Materials</p>
            <button
              onClick={() => setActiveSection('quality')}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 ${
                activeSection === 'quality' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Quality Control
            </button>
            <button
              onClick={() => setActiveSection('materials')}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 ${
                activeSection === 'materials' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Tools & Raw Materials
            </button>
            <button
              onClick={() => setActiveSection('material-requests')}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 ${
                activeSection === 'material-requests' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Material Requests
            </button>
          </div>

          {/* Workers & Planning */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Workers & Planning</p>
            <button
              onClick={() => setActiveSection('worker-assignments')}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 ${
                activeSection === 'worker-assignments' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Worker Assignments
            </button>
            <button
              onClick={() => setActiveSection('production-schedule')}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 ${
                activeSection === 'production-schedule' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Production Schedule
            </button>
            <button
              onClick={() => setActiveSection('equipment-maintenance')}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 ${
                activeSection === 'equipment-maintenance' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Equipment Maintenance
            </button>
          </div>

          {/* Reports */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Reports</p>
            <button
              onClick={() => setActiveSection('production-reports')}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 ${
                activeSection === 'production-reports' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Production Reports
            </button>
            <button
              onClick={() => setActiveSection('efficiency-analysis')}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 ${
                activeSection === 'efficiency-analysis' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Efficiency Analysis
            </button>
            <button
              onClick={() => setActiveSection('cost-analysis')}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 ${
                activeSection === 'cost-analysis' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Cost Analysis
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {activeSection === 'profile' ? 'User Profile' : 
               activeSection === 'my-schedule' ? 'My Schedule' :
               activeSection === 'orders' ? 'Production Orders' :
               activeSection === 'wip' ? 'Work-In-Progress' :
               activeSection === 'bom' ? 'Bill of Materials' :
               activeSection === 'quality' ? 'Quality Control' :
               activeSection === 'materials' ? 'Tools & Raw Materials' :
               activeSection === 'material-requests' ? 'Material Requests' :
               activeSection === 'worker-assignments' ? 'Worker Assignments' :
               activeSection === 'production-schedule' ? 'Production Schedule' :
               activeSection === 'equipment-maintenance' ? 'Equipment Maintenance' :
               activeSection === 'production-reports' ? 'Production Reports' :
               activeSection === 'efficiency-analysis' ? 'Efficiency Analysis' :
               activeSection === 'cost-analysis' ? 'Cost Analysis' :
               'Production Dashboard'}
            </h1>
            <p className="text-sm text-gray-600">
              {activeSection === 'profile' ? 'View and manage your profile information' :
               activeSection === 'my-schedule' ? 'View and manage your daily schedule and appointments' :
               activeSection === 'orders' ? 'Manage and track all production orders' :
               activeSection === 'wip' ? 'Products currently being manufactured' :
               activeSection === 'bom' ? 'Manage bill of materials for production' :
               activeSection === 'quality' ? 'Quality control management and inspections' :
               activeSection === 'materials' ? 'Monitor raw material inventory for production' :
               activeSection === 'material-requests' ? 'Track material requests and approvals' :
               activeSection === 'worker-assignments' ? 'Manage worker assignments and schedules' :
               activeSection === 'production-schedule' ? 'View and manage production schedules' :
               activeSection === 'equipment-maintenance' ? 'Track equipment maintenance schedules and status' :
               activeSection === 'production-reports' ? 'View detailed production reports and analytics' :
               activeSection === 'efficiency-analysis' ? 'Analyze production efficiency and performance metrics' :
               activeSection === 'cost-analysis' ? 'Analyze production costs and expenses' :
               'Monitor production, manage orders, and coordinate workers'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh Data
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg relative">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clearAuth();
                clearAuthLib();
                if (typeof window !== 'undefined') {
                  fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
                  window.location.replace(ROUTES.LOGIN);
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Dashboard Content */}
        {renderContent()}
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          open={confirmDialog.open}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};

export default ProductionSupervisorDashboard;
