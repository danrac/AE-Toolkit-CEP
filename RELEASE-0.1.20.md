# Toolbox 2 — 0.1.20 Alpha 1

Fixes a startup failure introduced by enabling CEP Node support: the template store now exposes its API to the panel even when CommonJS globals are present. This restores panel initialization in that environment.

Source discovery now reads saved working-space settings directly from supported unopened AEP and AEPX files, without switching the active project. Verified against six real files saved by After Effects: None, sRGB IEC61966-2.1, and Rec.709 Gamma 2.4 in both formats. Unknown/OCIO layouts explicitly report unavailable instead of substituting a footage profile. Inspection is limited to 256 MB.

Automated regression checks pass. Fixtures were created in a separate native After Effects instance; parser results were verified against its reported working spaces. A follow-up native parser run was unavailable because that test process had exited. No network share is mounted on this machine, so actual network/two-machine save validation remains unperformed.
