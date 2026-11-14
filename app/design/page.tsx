"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  DataTable,
  DatePicker,
  Grid,
  Input,
  Pagination,
  Select,
  type Column,
} from "../component/ui";
import FeedRollerGearClusterAssembly, { feedRollerGearClusterAssembly } from "../component/machine/FeedRollerGearClusterAssembly";
import LeftTransmissionAssembly, { leftTransmissionAssembly } from "../component/machine/LeftTransmissionAssembly";
import PadElastomerAssembly, { padElastomerAssembly } from "../component/machine/PadElastomerAssembly";
import PhotoTrayAssembly, { photoTrayAssembly } from "../component/machine/PhotoTrayAssembly";
import PickArmAssembly1, { pickArmAssembly1 } from "../component/machine/PickArmAssembly1";
import PickArmAssembly2, { pickArmAssembly2 } from "../component/machine/PickArmAssembly2";
import PickDriveAssembly, { pickDriveAssembly } from "../component/machine/PickDriveAssembly";
import PulleyTurnaroundAssembly, { pulleyTurnaroundAssembly } from "../component/machine/PulleyTurnaroundAssembly";
import UpgAssembly, { upgAssembly } from "../component/machine/UpgAssembly";
import Link from "next/link";
import { AppIcon, TeamBadge } from "../component/signature/BrandMarks";
import { SignatureBadge, SignatureFooter, SignatureKit, SignatureLogo, useSignatureStatus, type SignatureConfig } from "../component/signature/Signature";

type Robot = {
  id: string;
  name: string;
  zone: string;
  status: "Online" | "Charging" | "Offline";
  battery: number;
};

const robots: Robot[] = [
  { id: "RB-104", name: "Atlas", zone: "Assembly · A3", status: "Online", battery: 86 },
  { id: "RB-108", name: "Milo", zone: "Warehouse · B1", status: "Charging", battery: 32 },
  { id: "RB-112", name: "Nova", zone: "Packaging · C2", status: "Online", battery: 71 },
  { id: "RB-119", name: "Pico", zone: "Loading · D4", status: "Offline", battery: 0 },
];

const columns: Column<Robot>[] = [
  { key: "id", header: "Robot", cell: (robot) => <span className="font-mono text-xs text-muted">{robot.id}</span>, sortValue: (robot) => robot.id },
  { key: "name", header: "Name", cell: (robot) => <span className="font-medium">{robot.name}</span>, sortValue: (robot) => robot.name },
  { key: "zone", header: "Location", cell: (robot) => robot.zone },
  {
    key: "status",
    header: "Status",
    cell: (robot) => <Badge tone={robot.status === "Online" ? "brand" : robot.status === "Charging" ? "warning" : "neutral"}>{robot.status}</Badge>,
  },
  { key: "battery", header: "Battery", align: "right", cell: (robot) => `${robot.battery}%`, sortValue: (robot) => robot.battery },
];

/** Product details shown in the signature credits (see public/App.example.jsx). */
const signatureApp: SignatureConfig = {
  baseUrl: "/cp-ai-signature/assets",
  theme: "dark",
  locale: "en",
  product: "Robot Monitoring",
  appId: "ROBOT-MONITORING-001",
  version: "1.0.0",
  projectOwner: "TH-CP1-Innovation Team",
};

const sectionClass = "scroll-mt-8";
const sectionTitleClass = "mb-1 text-lg font-semibold tracking-tight";
const sectionDescriptionClass = "mb-5 text-sm text-muted";

export default function Home() {
  const [page, setPage] = useState(2);
  const [signature, setSignatureStatus] = useSignatureStatus();
  const signatureReady = signature === "ready";

  return (
    <main className="flex-1 bg-background px-4 py-8 text-foreground sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col justify-between gap-5 border-b border-line pb-8 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand">
              <AppIcon />
              ROBOT MONITORING
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Design system</h1>
            <p className="mt-2 max-w-xl text-muted">A living preview of the interface building blocks used across the operations dashboard.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-medium text-brand hover:underline">
              ← Room view
            </Link>
            <Badge tone="brand">UI kit · v1.0</Badge>
            <TeamBadge />
          </div>
        </header>

        <div className="space-y-10">
          <section className={sectionClass} aria-labelledby="machines-title">
            <h2 id="machines-title" className={sectionTitleClass}>Machines</h2>
            <p className={sectionDescriptionClass}>Three.js models built from the machine drawings. Drag to rotate, scroll to zoom.</p>
            <Card title={feedRollerGearClusterAssembly.name} description="6-axis arm · 2 SCARA robots · rotary index table · 2 bowl feeders">
              <FeedRollerGearClusterAssembly height={460} />
            </Card>
            <Card className="mt-4" title={leftTransmissionAssembly.name} description="5 SCARA robots · 2 dial plates · pallet loop · 6 bowl feeders · 2 tray magazines">
              <LeftTransmissionAssembly height={520} />
            </Card>
            <Card className="mt-4" title={padElastomerAssembly.name} description="2 SCARA robots · rotary disc · 2 overhead camera stations · feed cones · linear slide">
              <PadElastomerAssembly height={520} />
            </Card>
            <Card className="mt-4" title={photoTrayAssembly.name} description="5 six-axis robots · 2 rotary index tables · bowl feeder · 2 tray racks · guard fences">
              <PhotoTrayAssembly height={520} />
            </Card>
            <Card className="mt-4" title={pickArmAssembly1.name} description="2 SCARA robots · 2 bowl feeders · escapement · check station · discharge chute">
              <PickArmAssembly1 height={520} />
            </Card>
            <Card className="mt-4" title={pickArmAssembly2.name} description="2 SCARA robots · 6-axis arm · rotary disc · 4 bowl feeders · belt conveyor · HMI">
              <PickArmAssembly2 height={520} />
            </Card>
            <Card className="mt-4" title={pickDriveAssembly.name} description="3 SCARA robots · 3 bowl feeders · escapement · discharge chute · 3 power supplies">
              <PickDriveAssembly height={520} />
            </Card>
            <Card className="mt-4" title={pulleyTurnaroundAssembly.name} description="2 SCARA robots · rotary table · 2 bowl feeders · drum bulk feeder · HMI with keyboard">
              <PulleyTurnaroundAssembly height={520} />
            </Card>
            <Card className="mt-4" title={upgAssembly.name} description="3 SCARA robots · rotary table · 3 bowl feeders · linear track · OK / NG bins">
              <UpgAssembly height={520} />
            </Card>
          </section>

          <section className={sectionClass} aria-labelledby="foundations-title">
            <h2 id="foundations-title" className={sectionTitleClass}>Foundations</h2>
            <p className={sectionDescriptionClass}>Color, type, and surface tokens.</p>
            <Grid gap={16}>
              <Col md={6}>
                <Card title="Color palette" description="Brand and status colors">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                      ["Brand", "bg-brand", "#38BDF8"],
                      ["Brand soft", "bg-brand-soft", "#EEF6E1"],
                      ["Surface", "bg-surface-2", "#F6F8F5"],
                      ["Danger", "bg-danger", "#D64545"],
                      ["Warning", "bg-warning", "#D98E04"],
                      ["Info", "bg-info", "#2F7FC1"],
                    ].map(([name, color, hex]) => (
                      <div key={name} className="overflow-hidden rounded-control border border-line">
                        <div className={`h-12 ${color}`} />
                        <div className="px-2.5 py-2">
                          <p className="text-xs font-medium">{name}</p>
                          <p className="font-mono text-[10px] text-muted">{hex}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </Col>
              <Col md={6}>
                <Card title="Type & surfaces" description="Geist Sans with semantic text and surface levels">
                  <div className="space-y-4">
                    <div><p className="text-2xl font-semibold tracking-tight">Operations at a glance</p><p className="mt-1 text-sm text-muted">Regular body text and supporting details.</p></div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      {["bg-surface", "bg-surface-2", "bg-surface-3"].map((color, i) => <div key={color} className={`rounded-control border border-line p-3 ${color}`}>Surface {i + 1}</div>)}
                    </div>
                    <code className="block rounded-control bg-surface-2 px-3 py-2 font-mono text-xs text-muted">--radius-control: 8px</code>
                  </div>
                </Card>
              </Col>
            </Grid>
          </section>

          <section className={sectionClass} aria-labelledby="buttons-title">
            <h2 id="buttons-title" className={sectionTitleClass}>Buttons & badges</h2>
            <p className={sectionDescriptionClass}>Actions, sizes, and status labels.</p>
            <Grid gap={16}>
              <Col md={7}>
                <Card title="Buttons" description="Primary, secondary, ghost, and danger variants">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button>Save changes</Button><Button variant="secondary">Cancel</Button><Button variant="ghost">More options</Button><Button variant="danger">Remove robot</Button>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                    <Button size="sm">Small</Button><Button size="md">Medium</Button><Button size="lg">Large</Button><Button loading>Updating</Button><Button disabled variant="secondary">Disabled</Button>
                  </div>
                </Card>
              </Col>
              <Col md={5}>
                <Card title="Badges" description="Semantic tones for states and metadata">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="brand">Online</Badge><Badge tone="neutral">Idle</Badge><Badge tone="warning">Charging</Badge><Badge tone="danger">Needs attention</Badge><Badge tone="info">In transit</Badge>
                  </div>
                </Card>
              </Col>
            </Grid>
          </section>

          <section className={sectionClass} aria-labelledby="forms-title">
            <h2 id="forms-title" className={sectionTitleClass}>Form controls</h2>
            <p className={sectionDescriptionClass}>Inputs with labels, hints, validation, and native date selection.</p>
            <Card>
              <Grid gap={20}>
                <Col md={6}>
                  <Input label="Robot name" placeholder="e.g. Atlas" hint="Use a short, recognizable name." defaultValue="Atlas" />
                </Col>
                <Col md={6}>
                  <Select label="Operating zone" options={[{ value: "assembly", label: "Assembly floor" }, { value: "warehouse", label: "Warehouse" }, { value: "loading", label: "Loading bay" }]} defaultValue="assembly" />
                </Col>
                <Col md={6}>
                  <DatePicker label="Maintenance date" defaultValue="2026-11-14" />
                </Col>
                <Col md={6}>
                  <Input label="Serial number" defaultValue="RB-104" error="This serial number is already assigned." />
                </Col>
              </Grid>
            </Card>
          </section>

          <section className={sectionClass} aria-labelledby="cards-title">
            <h2 id="cards-title" className={sectionTitleClass}>Cards & grid</h2>
            <p className={sectionDescriptionClass}>Responsive 12-column layout and composable card regions.</p>
            <Grid gap={16}>
              <Col md={4}><Card title="Fleet health" description="Last 24 hours" actions={<Badge tone="brand">Healthy</Badge>}><p className="text-3xl font-semibold">98.6<span className="ml-1 text-base font-normal text-muted">%</span></p><p className="mt-2 text-sm text-muted">+2.4% from last week</p></Card></Col>
              <Col md={4}><Card title="Active robots" description="Across all facilities"><p className="text-3xl font-semibold">24<span className="ml-2 text-base font-normal text-muted">/ 28</span></p><div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-3"><div className="h-full w-[86%] rounded-full bg-brand" /></div></Card></Col>
              <Col md={4}><Card title="Maintenance queue" description="Requires review" footer="Updated 4 minutes ago"><p className="text-3xl font-semibold">03</p><p className="mt-2 text-sm text-muted">1 scheduled · 2 pending</p></Card></Col>
            </Grid>
          </section>

          <section className={sectionClass} aria-labelledby="signature-title">
            <h2 id="signature-title" className={sectionTitleClass}>AI Team signature</h2>
            <p className={sectionDescriptionClass}>Logo, badge and footer from the shared signature kit. Click the badge to view the credits.</p>
            <SignatureKit onStatus={setSignatureStatus} />
            <Card title="Signature components" description="SignatureLogo · SignatureBadge · SignatureFooter" actions={<Badge tone={signatureReady ? "brand" : "warning"}>{signatureReady ? "Kit loaded" : signature === "loading" ? "Loading…" : "Kit not found"}</Badge>}>
              {signature === "missing" && (
                <p className="mb-4 border border-dashed border-line p-3 text-sm text-muted">
                  The signature kit is not in this project yet. Copy its <code>dist</code> folder (ai-team-signature.css and .js) and <code>assets</code> folder into <code>public/cp-ai-signature/</code>, then reload.
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-6">
                <SignatureLogo ready={signatureReady} {...signatureApp} />
                <SignatureBadge ready={signatureReady} {...signatureApp} />
              </div>
              <div className="mt-6 border-t border-line pt-4">
                <SignatureFooter ready={signatureReady} {...signatureApp} />
              </div>
            </Card>
          </section>

          <section className={sectionClass} aria-labelledby="table-title">
            <h2 id="table-title" className={sectionTitleClass}>Data table & pagination</h2>
            <p className={sectionDescriptionClass}>Sortable columns, status badges, and page controls.</p>
            <DataTable columns={columns} data={robots} rowKey={(robot) => robot.id} caption="Robot fleet status" />
            <Card className="mt-4" title="Standalone pagination" description="Controlled pagination component">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="text-sm text-muted">Page {page} of 8</span>
                <Pagination page={page} pageCount={8} onPageChange={setPage} />
              </div>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}
