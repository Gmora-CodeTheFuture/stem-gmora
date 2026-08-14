<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Certificate — {{ $course }}</title>
    <style>
        /*
         * Explicit A4-landscape geometry (842pt x 595pt) throughout: dompdf's
         * box-sizing support is unreliable, so percentage widths plus padding
         * overflow the page and clip the border.
         */
        @page { margin: 0; }

        body {
            margin: 0;
            font-family: DejaVu Sans, sans-serif;
            color: #18181b;
        }

        .sheet { position: relative; width: 842pt; height: 595pt; }

        .frame {
            position: absolute;
            top: 26pt; left: 26pt;
            width: 788pt; height: 541pt;
            border: 1pt solid #2563eb;
        }

        .header { position: absolute; top: 66pt; left: 71pt; width: 700pt; text-align: center; }
        .body-block { position: absolute; top: 150pt; left: 71pt; width: 700pt; text-align: center; }

        .brand {
            font-size: 11pt;
            letter-spacing: 3pt;
            text-transform: uppercase;
            color: #2563eb;
            font-weight: bold;
        }

        .kicker {
            margin-top: 26pt;
            font-size: 9.5pt;
            letter-spacing: 2.5pt;
            text-transform: uppercase;
            color: #71717a;
        }

        .student { font-size: 36pt; font-weight: bold; }

        .rule {
            width: 300pt;
            margin: 18pt auto 0;
            border-bottom: 1pt solid #e4e4e7;
        }

        .lead { margin-top: 22pt; font-size: 11pt; color: #52525b; }

        .course {
            margin-top: 12pt;
            font-size: 22pt;
            font-weight: bold;
            color: #1d4ed8;
        }

        .footer { position: absolute; top: 452pt; left: 71pt; width: 700pt; }
        .footer table { width: 700pt; border-collapse: collapse; }
        .footer td { vertical-align: top; }

        .label {
            text-transform: uppercase;
            letter-spacing: 1pt;
            font-size: 7pt;
            color: #a1a1aa;
        }

        .value { font-size: 10pt; padding-top: 4pt; }
        .muted { font-size: 8pt; color: #71717a; }
        .signature-line { border-top: 1pt solid #d4d4d8; padding-top: 5pt; width: 190pt; }
        .qr img { width: 76pt; height: 76pt; }
    </style>
</head>
<body>
    <div class="sheet">
        <div class="frame"></div>

        <div class="header">
            <div class="brand">Gmora STEM</div>
            <div class="kicker">Certificate of Completion</div>
        </div>

        <div class="body-block">
            <div class="student">{{ $student }}</div>
            <div class="rule"></div>

            <div class="lead">has successfully completed every lesson of</div>
            <div class="course">{{ $course }}</div>
        </div>

        <div class="footer">
            <table>
                <tr>
                    <td style="width: 230pt;">
                        <div class="signature-line">
                            <div class="label">Instructor</div>
                            <div class="value">{{ $instructor ?? 'Gmora STEM' }}</div>
                        </div>
                    </td>

                    <td style="width: 300pt; text-align: center; padding-top: 6pt;">
                        <div class="label">Issued</div>
                        <div class="value">{{ $issuedAt?->format('j F Y') }}</div>
                        <div class="muted" style="padding-top: 8pt;">Verify at {{ $verifyUrl }}</div>
                    </td>

                    <td style="width: 170pt; text-align: right;" class="qr">
                        <img src="{{ $qrCode }}" alt="Verification QR code">
                        <div class="muted">{{ $certificate->certificate_code }}</div>
                    </td>
                </tr>
            </table>
        </div>
    </div>
</body>
</html>
