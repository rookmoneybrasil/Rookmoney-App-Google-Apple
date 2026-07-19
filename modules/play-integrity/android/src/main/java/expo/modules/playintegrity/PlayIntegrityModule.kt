package expo.modules.playintegrity

import com.google.android.play.integrity.IntegrityManagerFactory
import com.google.android.play.integrity.IntegrityTokenRequest
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PlayIntegrityModule : Module() {
  // Google Cloud project number linked to the Rook Money app in Play Console.
  private val CLOUD_PROJECT_NUMBER = 632276062518L

  override fun definition() = ModuleDefinition {
    Name("PlayIntegrity")

    // Classic Play Integrity request — one call per high-value action (a purchase).
    // Returns the opaque integrity token, which the server decodes via the
    // Play Integrity API. Note: a rooted/emulator device still RETURNS a token
    // here — the compromise shows up in the verdict, evaluated server-side.
    AsyncFunction("requestIntegrityToken") { nonce: String, promise: Promise ->
      val context = appContext.reactContext?.applicationContext
      if (context == null) {
        promise.reject("ERR_NO_CONTEXT", "No application context available", null)
        return@AsyncFunction
      }

      try {
        val manager = IntegrityManagerFactory.create(context)
        manager.requestIntegrityToken(
          IntegrityTokenRequest.builder()
            .setNonce(nonce)
            .setCloudProjectNumber(CLOUD_PROJECT_NUMBER)
            .build()
        )
          .addOnSuccessListener { response ->
            promise.resolve(response.token())
          }
          .addOnFailureListener { e ->
            promise.reject("ERR_INTEGRITY", e.message ?: "Integrity request failed", e)
          }
      } catch (e: Exception) {
        promise.reject("ERR_INTEGRITY", e.message ?: "Integrity request failed", e)
      }
    }
  }
}
