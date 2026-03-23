"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { useAuthStore } from "@/store/authStore";
import { MapPin, Plus, Edit, Trash2, CheckCircle, XCircle, Warehouse, Building2 } from "lucide-react";

type Location = {
  location_id: number;
  company_id?: number | null;
  branch_id?: number | null;
  name: string;
  code?: string | null;
  location_type: string;
  description?: string | null;
  is_active: number;
  created_at: string;
};

export function LocationsAndWarehouses() {
  const { user } = useAuthStore();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    location_type: "warehouse",
    description: "",
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadLocations();
  }, [user?.company_id]);

  const loadLocations = async () => {
    setLoading(true);
    setError(null);

    const url = user?.company_id
      ? `/inventory/locations?companyId=${user.company_id}`
      : "/inventory/locations";
    const response = await api.get<Location[]>(url);

    if (response.error) {
      // Handle 404 as endpoint not implemented yet
      if (response.error.includes("404") || response.error.includes("Not Found")) {
        setError(null); // Don't show error for missing endpoint
        setLocations([]); // Set empty array
      } else {
        setError(response.error);
      }
      setLoading(false);
      return;
    }

    setLocations(response.data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formData.name.trim()) {
      setFormError("Location name is required");
      return;
    }

    setSubmitting(true);

    if (editingLocation) {
      const response = await api.put<Location>(`/inventory/locations/${editingLocation.location_id}`, {
        name: formData.name.trim(),
        location_type: formData.location_type,
        description: formData.description.trim() || null,
        is_active: formData.is_active,
      });

      if (response.error) {
        if (response.error.includes("404") || response.error.includes("Not Found")) {
          setFormError("This endpoint is not yet implemented on the backend. Please contact your administrator.");
        } else {
          setFormError(response.error);
        }
        setSubmitting(false);
        return;
      }

      setFormSuccess("Location updated successfully!");
      setSubmitting(false);
      setShowForm(false);
      setEditingLocation(null);
      resetForm();
      loadLocations();
      setTimeout(() => setFormSuccess(null), 3000);
    } else {
      const response = await api.post<Location>("/inventory/locations", {
        name: formData.name.trim(),
        location_type: formData.location_type,
        description: formData.description.trim() || null,
        is_active: formData.is_active,
      });

      if (response.error) {
        if (response.error.includes("404") || response.error.includes("Not Found")) {
          setFormError("This endpoint is not yet implemented on the backend. Please contact your administrator.");
        } else {
          setFormError(response.error);
        }
        setSubmitting(false);
        return;
      }

      setFormSuccess("Location created successfully!");
      setSubmitting(false);
      setShowForm(false);
      resetForm();
      loadLocations();
      setTimeout(() => setFormSuccess(null), 3000);
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name || "",
      location_type: location.location_type || "warehouse",
      description: location.description ?? "",
      is_active: location.is_active === 1,
    });
    setShowForm(true);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleDelete = async (locationId: number) => {
    if (!confirm("Are you sure you want to delete this location? This action cannot be undone.")) {
      return;
    }

    setError(null);
    const response = await api.delete(`/inventory/locations/${locationId}`);

    if (response.error) {
      setError(response.error);
      return;
    }

    loadLocations();
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingLocation(null);
    resetForm();
    setFormError(null);
    setFormSuccess(null);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      location_type: "warehouse",
      description: "",
      is_active: true,
    });
  };

  const getLocationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      warehouse: "Warehouse",
      store: "Store",
      distribution_center: "Distribution Center",
      production: "Production",
      storage: "Storage",
      packaging: "Packaging",
      cold_room: "Cold Room",
      dispatch: "Dispatch",
      office: "Office",
      transit: "Transit",
      other: "Other",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locations & Warehouses</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage warehouse locations and storage facilities
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="text-emerald-500 hover:text-emerald-200 border-transparent hover:bg-transparent shadow-none cursor-pointer transition-colors duration-150 ease-in-out"
          onClick={() => {
            setShowForm(true);
            setEditingLocation(null);
            resetForm();
            setFormError(null);
            setFormSuccess(null);
          }}
          disabled={showForm}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Location
        </Button>
      </div>

      {error && <ErrorMessage error={error} />}
      {formSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {formSuccess}
          </div>
        </div>
      )}

      {showForm && (
        <Card className="border border-gray-200 bg-white">
          <CardHeader>
            <CardTitle>{editingLocation ? "Edit Location" : "Create New Location"}</CardTitle>
            <CardDescription>
              {editingLocation
                ? "Update the location details below"
                : "Fill in the details to create a new warehouse or storage location"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Location Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g., Main Warehouse, Production Floor"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  disabled={submitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location_type">Location Type *</Label>
                <select
                  id="location_type"
                  value={formData.location_type}
                  onChange={(e) =>
                    setFormData({ ...formData, location_type: e.target.value })
                  }
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="warehouse">Warehouse</option>
                  <option value="store">Store</option>
                  <option value="distribution_center">Distribution Center</option>
                  <option value="production">Production</option>
                  <option value="storage">Storage</option>
                  <option value="packaging">Packaging</option>
                  <option value="cold_room">Cold Room</option>
                  <option value="dispatch">Dispatch</option>
                  <option value="office">Office</option>
                  <option value="transit">Transit</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="Brief description of the location"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="is_active">Active</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="is_active"
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    disabled={submitting}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="is_active" className="text-sm font-normal">
                    Location is active and can be used
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="is_default">Default Location</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="is_default"
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) =>
                      setFormData({ ...formData, is_default: e.target.checked })
                    }
                    disabled={submitting}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="is_default" className="text-sm font-normal">
                    Set as default location for this branch
                  </Label>
                </div>
              </div>

              {formError && <ErrorMessage error={formError} />}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={submitting}
                  variant="ghost"
                  className="text-emerald-500 font-semibold hover:text-emerald-200 border-transparent hover:bg-transparent shadow-none cursor-pointer transition-colors duration-150 ease-in-out"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      {editingLocation ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      {editingLocation ? (
                        <>
                          <Edit className="mr-2 h-4 w-4" />
                          Update Location
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Location
                        </>
                      )}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-600 hover:text-red-300 border-transparent hover:bg-transparent shadow-none cursor-pointer transition-colors duration-150 ease-in-out"
                  onClick={handleCancel}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border border-gray-200 bg-white">
        <CardHeader>
          <CardTitle>Available Locations</CardTitle>
          <CardDescription>
            {locations.length === 0
              ? "No locations found. Create your first location to get started."
              : `Total: ${locations.length} location${locations.length !== 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-gray-500">
              <Warehouse className="h-10 w-10 text-blue-600" />
              <p className="text-lg font-semibold text-gray-900">No locations yet</p>
              <p className="text-sm">
                Create your first location to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {locations.map((location) => (
                <div
                  key={location.location_id}
                  className="flex items-start justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{location.name}</p>
                      {location.code && (
                        <span className="text-sm text-gray-600">({location.code})</span>
                      )}
                      {location.is_active === 0 && (
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          Inactive
                        </span>
                      )}
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                        {getLocationTypeLabel(location.location_type)}
                      </span>
                    </div>
                    {location.description && (
                      <p className="text-sm text-gray-600">{location.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(location)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(location.location_id)}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

