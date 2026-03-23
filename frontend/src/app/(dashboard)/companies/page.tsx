"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { useAuthStore } from "@/store/authStore";
import { Building2, MapPin, PlusCircle } from "lucide-react";

type Company = {
  company_id: number;
  name: string;
  company_code?: string;
  subscription_plan?: string;
  country?: string;
  created_at?: string;
};

type Branch = {
  branch_id: number;
  name: string;
  code: string;
  city?: string;
  state?: string;
  country?: string;
  email?: string;
  phone?: string;
  is_headquarters?: number;
  is_active?: number;
};

const initialBranchForm = {
  name: "",
  code: "",
  email: "",
  phone: "",
  city: "",
  state: "",
  country: "",
  address_line1: "",
  address_line2: "",
  postal_code: "",
  is_headquarters: false,
};

export default function CompaniesPage() {
  const { user } = useAuthStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    null,
  );
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [branchesError, setBranchesError] = useState<string | null>(null);
  const [formState, setFormState] = useState(initialBranchForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canManageBranches = Boolean(
    user?.is_super_admin || user?.is_company_admin,
  );

  const selectedCompany = useMemo(
    () => companies.find((company) => company.company_id === selectedCompanyId),
    [companies, selectedCompanyId],
  );

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      loadBranches(selectedCompanyId);
    } else {
      setBranches([]);
    }
  }, [selectedCompanyId]);

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    setCompaniesError(null);

    const response = await api.get<Company[]>("/companies");

    if (response.error) {
      setCompaniesError(response.error);
      setLoadingCompanies(false);
      return;
    }

    const data = response.data ?? [];
    setCompanies(data);
    setSelectedCompanyId(
      (prev) => prev ?? data[0]?.company_id ?? user?.company_id ?? null,
    );
    setLoadingCompanies(false);
  };

  const loadBranches = async (companyId: number) => {
    setLoadingBranches(true);
    setBranchesError(null);

    const response = await api.get<Branch[]>(
      `/companies/${companyId}/branches`,
    );

    if (response.error) {
      setBranchesError(response.error);
      setBranches([]);
      setLoadingBranches(false);
      return;
    }

    setBranches(response.data ?? []);
    setLoadingBranches(false);
  };

  const handleBranchFormChange = (
    event:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const { name, value, type, checked } = event.target as HTMLInputElement;
    setFormState((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setFormError(null);
    setFormSuccess(null);
  };

  const handleCreateBranch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCompanyId) {
      setFormError("Select a company before creating a branch.");
      return;
    }

    if (!formState.name || !formState.code) {
      setFormError("Branch name and code are required.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    const payload = {
      ...formState,
      is_headquarters: formState.is_headquarters ? 1 : 0,
    };

    const response = await api.post<Branch>(
      `/companies/${selectedCompanyId}/branches`,
      payload,
    );

    if (response.error) {
      setFormError(response.error);
      setSubmitting(false);
      return;
    }

    setFormSuccess("Branch created successfully.");
    setFormState(initialBranchForm);
    setSubmitting(false);
    loadBranches(selectedCompanyId);
  };

  const renderCompanyCards = () => {
    if (loadingCompanies) {
      return (
        <Card className="col-span-full bg-white/80">
          <CardContent className="flex justify-center py-10">
            <LoadingSpinner />
          </CardContent>
        </Card>
      );
    }

    if (companiesError) {
      return <ErrorMessage error={companiesError} />;
    }

    if (companies.length === 0) {
      return (
        <Card className="col-span-full bg-white/80">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 text-primary" />
            <div>
              <p className="text-lg font-semibold text-foreground">
                No companies detected
              </p>
              <p className="text-sm">
                Sign up as an owner to provision your first organization.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return companies.map((company) => {
      const isActive = company.company_id === selectedCompanyId;
      return (
        <Card
          key={company.company_id}
          onClick={() => setSelectedCompanyId(company.company_id)}
          className={`cursor-pointer border-2 transition-all ${isActive ? "border-primary shadow-lg" : "border-border/50 hover:border-primary/50"}`}
        >
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">{company.name}</CardTitle>
              <CardDescription>
                {company.company_code ? `Code: ${company.company_code}` : "—"}
              </CardDescription>
            </div>
            {company.subscription_plan && (
              <Badge className="bg-primary/10 text-primary">
                {company.subscription_plan}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{company.country || "Country not set"}</span>
            </div>
            <div className="flex justify-between">
              <span>Branches</span>
              <span className="font-semibold text-foreground">
                {isActive ? branches.length : "Tap to view"}
              </span>
            </div>
            {company.created_at && (
              <div className="flex justify-between">
                <span>Created</span>
                <span>
                  {new Date(company.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      );
    });
  };

  const renderBranches = () => {
    if (!selectedCompany) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-muted-foreground">
          <Building2 className="h-10 w-10 text-primary" />
          <p>Select a company to inspect its branch network.</p>
        </div>
      );
    }

    if (loadingBranches) {
      return (
        <div className="py-10">
          <LoadingSpinner />
        </div>
      );
    }

    if (branchesError) {
      return <ErrorMessage error={branchesError} />;
    }

    if (branches.length === 0) {
      return (
        <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
          <PlusCircle className="h-10 w-10 text-primary" />
          <div>
            <p className="text-lg font-semibold text-foreground">
              No branches found
            </p>
            <p className="text-sm">
              Use the form to add your first branch and unlock multi-location
              workflows.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {branches.map((branch) => (
          <div
            key={branch.branch_id}
            className="rounded-2xl border border-border/60 bg-white/70 p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {branch.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Code: {branch.code}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {branch.is_headquarters ? (
                  <Badge className="bg-amber-100 text-amber-800">
                    Headquarters
                  </Badge>
                ) : (
                  <Badge variant="outline">Branch</Badge>
                )}
                <Badge
                  className={
                    branch.is_active ? "bg-emerald-100 text-emerald-700" : ""
                  }
                  variant={branch.is_active ? "default" : "outline"}
                >
                  {branch.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>
                  {[branch.city, branch.state, branch.country]
                    .filter(Boolean)
                    .join(", ") || "Location TBD"}
                </span>
              </div>
              <div className="flex flex-wrap gap-4">
                {branch.email && (
                  <span className="font-medium text-foreground">
                    {branch.email}
                  </span>
                )}
                {branch.phone && (
                  <span className="text-foreground/80">{branch.phone}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Badge className="bg-primary/10 text-primary">Workspace</Badge>
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Companies & Branches
          </h1>
          <p className="text-muted-foreground">
            Keep your tenant portfolio organized and spin up new branches in a
            few clicks.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {renderCompanyCards()}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="bg-white/90">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Branch Footprint</CardTitle>
              <CardDescription>
                {selectedCompany
                  ? `Locations reporting to ${selectedCompany.name}`
                  : "Select a company to inspect locations"}
              </CardDescription>
            </div>
            {selectedCompany && (
              <Button
                variant="ghost"
                className="text-primary"
                onClick={() => loadBranches(selectedCompany.company_id)}
              >
                Refresh
              </Button>
            )}
          </CardHeader>
          <CardContent>{renderBranches()}</CardContent>
        </Card>

        <Card className="bg-gradient-to-b from-white via-white to-primary/5">
          <CardHeader>
            <CardTitle>Create Branch</CardTitle>
            <CardDescription>
              Extend your operations footprint into new regions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canManageBranches ? (
              <form className="space-y-4" onSubmit={handleCreateBranch}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Branch Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formState.name}
                      onChange={handleBranchFormChange}
                      placeholder="Westlands HQ"
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Branch Code</Label>
                    <Input
                      id="code"
                      name="code"
                      value={formState.code}
                      onChange={handleBranchFormChange}
                      placeholder="NBO-HQ"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formState.email}
                      onChange={handleBranchFormChange}
                      placeholder="hq@acme.com"
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formState.phone}
                      onChange={handleBranchFormChange}
                      placeholder="+254 700 000000"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formState.city}
                      onChange={handleBranchFormChange}
                      placeholder="Nairobi"
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      name="country"
                      value={formState.country}
                      onChange={handleBranchFormChange}
                      placeholder="Kenya"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="address_line1">Address Line 1</Label>
                    <Input
                      id="address_line1"
                      name="address_line1"
                      value={formState.address_line1}
                      onChange={handleBranchFormChange}
                      placeholder="21 Riverside Drive"
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Postal Code</Label>
                    <Input
                      id="postal_code"
                      name="postal_code"
                      value={formState.postal_code}
                      onChange={handleBranchFormChange}
                      placeholder="00100"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    name="is_headquarters"
                    checked={formState.is_headquarters}
                    onChange={handleBranchFormChange}
                    disabled={submitting}
                    className="h-4 w-4 rounded border border-border text-primary focus:ring-0"
                  />
                  Mark as headquarters
                </label>

                <ErrorMessage error={formError} />
                {formSuccess && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {formSuccess}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting || !selectedCompany}
                >
                  {submitting ? "Creating..." : "Add Branch"}
                </Button>
              </form>
            ) : (
              <div className="rounded-2xl border border-dashed border-primary/30 bg-white/70 p-6 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">View only</p>
                <p>
                  Only company administrators can provision new branches.
                  Request elevated access from your workspace owner.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


