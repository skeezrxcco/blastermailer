"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { campaignHistory } from "@/app/activity/activity-page.data"
import { WorkspaceShell } from "@/components/shared/workspace/app-shell"

export function ActivityPageClient() {
  return (
    <WorkspaceShell tab="activity">
      <div className="scrollbar-hide min-h-0 h-full overflow-y-auto p-4 md:p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-zinc-100">Campaign activity</h2>
          <p className="text-sm text-zinc-400">Track all campaigns, delivery status, and performance metrics.</p>
        </div>

        <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/80">
          <CardHeader>
            <CardTitle className="text-zinc-100">All campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-300">Campaign</TableHead>
                  <TableHead className="text-zinc-300">Template</TableHead>
                  <TableHead className="text-zinc-300">Audience</TableHead>
                  <TableHead className="text-zinc-300">Open</TableHead>
                  <TableHead className="text-zinc-300">Click</TableHead>
                  <TableHead className="text-zinc-300">Status</TableHead>
                  <TableHead className="text-zinc-300">Sent at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignHistory.map((campaign) => (
                  <TableRow key={campaign.id} className="border-zinc-900 hover:bg-zinc-900/60">
                    <TableCell className="text-zinc-200">{campaign.campaignName}</TableCell>
                    <TableCell className="text-zinc-300">{campaign.templateName}</TableCell>
                    <TableCell className="text-zinc-300">{campaign.audienceCount.toLocaleString()}</TableCell>
                    <TableCell className="text-zinc-300">{campaign.openRate}</TableCell>
                    <TableCell className="text-zinc-300">{campaign.clickRate}</TableCell>
                    <TableCell>
                      <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-xs text-emerald-200">{campaign.status}</span>
                    </TableCell>
                    <TableCell className="text-zinc-400">{campaign.sentAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </WorkspaceShell>
  )
}
