# Floor QR generation — BE-007

## Payload contract for BE-008

Each printed QR contains the existing `floors.qr_code_id` UUID as plain text.
The manifest names this format `floor-uuid-v1`; the format name is manifest
metadata and is not prepended to the scanned text. Case is preserved.
`parseFloorQrPayload` in `src/features/quick-scan/floor-qr-payload.ts` validates
scanned input and returns the identifier, or null for an invalid payload.

BE-008 should resolve that identifier against `floors.qr_code_id`, join its
parent `locations` record, and check both `is_active` flags on resolve and again
on submission. Floor/building IDs, GPS, user identity and crowd level are supplied
or resolved through the check-in API rather than embedded in the QR. The FE
scanner already returns raw decoded text for a gateway to submit.

Generation is a read-only reference-data operation. BE-008 owns authenticated
resolution/submission, GPS validation and the user/floor cooldown. A printed QR
is an identifier rather than permission to write a check-in.

## Generate from the target database

Run on Node 24 after `npm ci` and Local DB setup. Only an operator with Docker
access to the Local PostgreSQL container can use the default source. QR columns
keep their existing restricted grants; there is no public generation endpoint
and no browser/service-role key configuration to add.

```sh
npm run qr:generate -- --output artifacts/floor-qr/local-batch-01
```

On Windows PowerShell, `npm.cmd` can be used in place of `npm`. Override the
Local container name with `--container` if the approved environment uses another
name. The SQL query is fixed and runs in a read-only repeatable-read transaction.
Schema migrations, seed imports and QR rotation do not run during generation.

The output directory must be new. Repeating the command with a new batch path
uses the same database identifiers and produces the same QR content. Existing
print batches are preserved. Invalid/duplicate mapping is rejected before output
creation. A failed generation removes only its own newly created output directory;
`manifest.json` is published after generation and decode checks complete.

### Files

- `svg/` contains vector QR images for active building/floor pairs.
- `png/` contains 512 px PNG images with four-module white margins and medium
  error correction. Every PNG is decoded using the existing `jsqr` package before
  the batch succeeds.
- `print.html` is self-contained, with embedded vector images and Thai building/
  floor labels. Open it in a browser and print A4 portrait at 100% scale, margins
  10 mm, headers/footers disabled. Each sheet holds six labels. Browser print can
  save a PDF. Check the printer preview before printing the whole batch.
- `manifest.json` records format, generation time, source floor count and each
  building/floor/UUID mapping, active flags, relative image paths and PNG SHA-256.
  Inactive records remain auditable with `printable: false` and null file paths.

The approved Local dataset has 224 floor UUIDs. With S7 inactive, 222 floor
labels are printable, giving 37 A4 sheets. Generated batches live under the
gitignored `artifacts/floor-qr/` directory and should be shared with the approved
installation team through a controlled location.

### Hosted database or approved snapshot

Generate installation assets from the database the deployed app will actually
use. Fresh seeds in separate databases may generate different UUIDs. A Local
print batch is valid for its Local mapping; it does not establish a Cloud mapping.

For Cloud, apply the approved schema/data first and export the following query
through the database owner's SQL tooling. Save the returned JSON array as UTF-8,
then generate from that file. Public clients cannot export the QR column.

```sql
select coalesce(json_agg(row_to_json(source)), '[]'::json)
from (
  select l.id as location_id, l.building, l.name as building_name,
    l.is_active as location_active, f.id as floor_id, f.floor_name,
    f.is_active as floor_active, f.qr_code_id
  from public.floors f
  join public.locations l on l.id = f.location_id
  order by l.id, f.id
) source;
```

```sh
npm run qr:generate -- --input approved-floor-snapshot.json --output artifacts/floor-qr/cloud-batch-01
```

Keep approved source snapshots in a private operational location. Record the
target database alongside the batch. After a source change, regenerate from a
fresh export and compare the manifest before installation. QR generation requires
existing floor records and UUIDs, not a new QR column in the aggregate floor CSV.

## Existing prints and deactivation

Disable a floor or its parent building with the existing `is_active` switch.
Existing paper keeps the same UUID; BE-008 must reject it while either record is
inactive. Reactivating the same identity lets the same print resolve again.
Generation never rotates identifiers. A separately approved rotation must update
the database and replace the affected physical print; the old UUID then fails
resolution. The user/floor cooldown stays keyed to floor identity.

## Verification

```sh
node --test tests/floor-qr.test.mjs
npm run lint
npm run typecheck
npm test
npm run build
```

Tests cover payload validation, duplicate/inconsistent mappings, real QR encoding
and decoding, disabled building/floor exclusion, repeated-batch identity stability,
output overwrite protection, label escaping and empty data. Test inputs stay in
memory and temporary files rather than entering the application database.

Generated files are verified against their source identifier before publication.
Use the manifest to compare the decoded UUID with the target database's floor
and parent building. When BE-008 is available, send the same raw UUID through its
resolve API and compare the returned identity before placing physical labels.
Phone-camera and actual printer checks remain installation checks.

QR encoder reference: [node-qrcode documentation](https://github.com/soldair/node-qrcode).
