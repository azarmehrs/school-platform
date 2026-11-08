<?php
declare(strict_types=1);

function sms_config(): array {
 $defaults=['enabled'=>false,'otp_enabled'=>false,'api_key'=>'','line_number'=>'','otp_pattern'=>'y5ZP3dLFs5','otp_attribute'=>'code'];
 $file=__DIR__.'/sms-config.php';
 if(!is_file($file))return $defaults;
 $value=require $file;
 return is_array($value)?array_merge($defaults,$value):$defaults;
}
function sms_public_config(): array {$c=sms_config();return ['configured'=>$c['enabled']&&$c['api_key']!==''&&$c['line_number']!=='','otpEnabled'=>$c['enabled']&&$c['otp_enabled']&&$c['otp_pattern']!==''];}
function sms_save_config(array $body): array {
 $previous=sms_config();$api=trim((string)($body['apiKey']??''));if($api==='')$api=$previous['api_key'];
 $config=['enabled'=>(bool)($body['enabled']??false),'otp_enabled'=>(bool)($body['otpEnabled']??false),'api_key'=>$api,'line_number'=>preg_replace('/\D/','',ascii_digits((string)($body['lineNumber']??''))),'otp_pattern'=>trim((string)($body['otpPattern']??'')),'otp_attribute'=>preg_replace('/[^A-Za-z0-9_]/','',(string)($body['otpAttribute']??'code'))?:'code'];
 school_require(!$config['enabled']||strlen($config['api_key'])>=10,'کلید API فراز اس‌ام‌اس را وارد کنید.');
 school_require(!$config['otp_enabled']||$config['otp_pattern']!=='','برای ورود پیامکی کد پترن OTP لازم است.');
 $temp=__DIR__.'/sms-config.pending.php';$target=__DIR__.'/sms-config.php';
 school_require(file_put_contents($temp,"<?php\nreturn ".var_export($config,true).";\n",LOCK_EX)!==false,'ذخیره تنظیمات پیامک انجام نشد.');@chmod($temp,0600);school_require(rename($temp,$target),'ذخیره امن تنظیمات پیامک انجام نشد.');
 return $config;
}
function faraz_error_message(array $result): string {
 $message=$result['message']??$result['error']??null;
 if(is_string($message)&&trim($message)!=='')return trim($message);
 $messages=$result['messages']??null;
 if(is_array($messages)){foreach($messages as $item){if(is_string($item)&&trim($item)!=='')return trim($item);if(is_array($item)){foreach($item as $text)if(is_string($text)&&trim($text)!=='')return trim($text);}}}
 return 'فراز اس‌ام‌اس درخواست را نپذیرفت.';
}
function faraz_request(string $method,string $path,?array $payload=null): array {
 $c=sms_config();school_require($c['enabled']&&$c['api_key']!=='','سرویس پیامک فعال و پیکربندی نشده است.');$url='https://api.iranpayamak.com'.$path;$headers=['Accept: application/json','Api-Key: '.$c['api_key']];$body=$payload===null?'':json_encode($payload,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);if($payload!==null)$headers[]='Content-Type: application/json';
 $options=['http'=>['method'=>$method,'timeout'=>20,'ignore_errors'=>true,'header'=>implode("\r\n",$headers),'content'=>$body],'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true]];
 $raw=@file_get_contents($url,false,stream_context_create($options));$status=0;if(isset($http_response_header[0])&&preg_match('/\s(\d{3})\s/',$http_response_header[0],$m))$status=(int)$m[1];school_require(is_string($raw),'ارتباط خروجی HTTPS هاست با فراز اس‌ام‌اس برقرار نشد؛ گزینه allow_url_fopen را برای این ساب‌دامین فعال کنید.');
 $result=json_decode($raw,true);school_require(is_array($result),'پاسخ فراز اس‌ام‌اس معتبر نبود.');if($status<200||$status>=300)throw new InvalidArgumentException(faraz_error_message($result));return $result;
}
function faraz_send_pattern(string $phone,string $code): array {$c=sms_config();school_require((bool)$c['otp_enabled'],'ورود پیامکی غیرفعال است.');school_require($c['line_number']!=='','سرشماره فراز هنوز تعیین نشده است؛ راهبر فنی ابتدا آزمایش اتصال را اجرا کند.');return faraz_request('POST','/ws/v1/sms/pattern',['code'=>$c['otp_pattern'],'attributes'=>[$c['otp_attribute']=>$code],'recipient'=>$phone,'line_number'=>$c['line_number'],'number_format'=>'english']);}
function faraz_send_simple(array $phones,string $text): array {$c=sms_config();school_require($c['line_number']!=='','سرشماره فراز هنوز تعیین نشده است؛ راهبر فنی ابتدا آزمایش اتصال را اجرا کند.');$phones=array_values(array_unique(array_filter(array_map(fn($p)=>preg_replace('/\D/','',ascii_digits((string)$p)),$phones),fn($p)=>preg_match('/^09\d{9}$/D',(string)$p))));school_require($phones!==[]&&trim($text)!=='','شماره گیرنده و متن پیامک لازم است.');school_require(count($phones)<=500,'در هر ارسال حداکثر ۵۰۰ گیرنده مجاز است.');school_require(mb_strlen(trim($text))<=1000,'متن پیامک حداکثر ۱۰۰۰ نویسه است.');return faraz_request('POST','/ws/v1/sms/simple',['text'=>trim($text),'line_number'=>$c['line_number'],'recipients'=>$phones,'number_format'=>'english']);}
function faraz_request_id(array $result): string {$data=$result['data']??'';if(is_scalar($data))return (string)$data;if(is_array($data)){foreach(['id','request_id','message_id','bulk_id'] as $key)if(isset($data[$key])&&is_scalar($data[$key]))return (string)$data[$key];}return '';}
function faraz_first_line(mixed $value): string {if(is_string($value)&&preg_match('/^\d{5,20}$/D',$value))return $value;if(is_array($value)){foreach(['line_number','number','from','sender'] as $key)if(isset($value[$key])&&is_scalar($value[$key])){$line=preg_replace('/\D/','',(string)$value[$key]);if(preg_match('/^\d{5,20}$/D',$line))return $line;}foreach($value as $child){$line=faraz_first_line($child);if($line!=='')return $line;}}return '';}
