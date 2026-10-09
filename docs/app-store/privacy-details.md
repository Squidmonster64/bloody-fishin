# Privacy and App Privacy answers — draft

Prepared: 8 October 2026 (AWST)

This draft records observed product behaviour. It is not a published privacy policy and must be reviewed against the production hosting configuration before App Store submission.

## Observed client behaviour

- No account, login, advertising SDK, payment SDK or user-generated-content service.
- No device GPS request in the reviewed source. Users choose a named place or enter coordinates.
- Saved spots, vessel profiles, theme and last-successful forecast cache are held in local device/browser storage.
- Forecast requests send the selected name/coordinates and forecast settings to `weather.bloodydaves.com`, which then calls Open-Meteo. The legacy web client also calls Open-Meteo and TimeAPI.io directly.
- Native sharing uses the operating-system share sheet and only when the user invokes it.

## Production facts that must be confirmed

- Railway/Cloudflare request-log retention, IP-address handling and access controls.
- Whether Floot's published native/web wrapper adds analytics. The project currently uses Floot's default setting; no analytics choice was changed in this sprint.
- A public contact method for privacy enquiries and deletion/access requests.
- Final data-flow after the BOM link-only release change.

## Conservative App Privacy position

Do not answer “Data Not Collected” until the production hosting and Floot analytics facts above are confirmed. If request logs retain IP address and selected coordinates beyond transient service delivery, declare the applicable diagnostics/location categories and purposes. The saved-spot data itself is not linked to an account in the reviewed product.

## Privacy-policy content to publish

The final public policy should state:

- what location/coordinate and technical request data is transmitted;
- that saved spots and caches stay on device unless the user shares them;
- which processors/providers receive requests;
- retention and deletion rules;
- that no data is sold and no targeted advertising is present, if still accurate;
- owner identity, contact details, effective date and jurisdiction.
