# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.kts.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# =============================================================================
# R8 Full Mode Rules (AGP 9.0+ enables full mode by default)
# =============================================================================

# Keep Kotlin Metadata (required for reflection-based libraries in full mode)
-keep class kotlin.Metadata { *; }
-keepattributes RuntimeVisibleAnnotations

# Keep Retrofit interfaces
-keep,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}

# Keep Gson serialized classes
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# Keep fields annotated with @SerializedName
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Keep Hilt generated classes
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }
-keep class * extends dagger.hilt.android.internal.managers.ViewComponentManager$FragmentContextWrapper { *; }

# Keep sync DTO classes (deserialized by Gson via reflection)
-keep class com.codenized.planixor.data.sync.** { *; }

# Keep Room entities (reflective access by Room runtime)
-keep class com.codenized.planixor.data.local.*Entity { *; }

# Keep domain models used in serialization/backup
-keep class com.codenized.planixor.domain.model.** { *; }
-keep class com.codenized.planixor.domain.backup.** { *; }

# Gson TypeToken (needed for generic type preservation in R8 full mode)
-keep class com.google.gson.reflect.TypeToken { *; }
-keep class * extends com.google.gson.reflect.TypeToken

# Prevent R8 full mode from unboxing enums used in serialization
-keepclassmembers enum com.codenized.planixor.** {
    <fields>;
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# OkHttp platform warnings
-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
